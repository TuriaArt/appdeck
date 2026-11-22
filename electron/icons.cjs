"use strict";

/**
 * Extracts application icons via PowerShell (System.Drawing.Icon.ExtractAssociatedIcon).
 * Sources, in order of preference:
 *   1. The registry DisplayIcon value (an .exe or .ico path).
 *   2. The executable from the index (registry.cjs field), if it is an .exe/.ico.
 *   3. Fallback: the main .exe inside the install folder (scanned up to 2 levels deep;
 *      uninstallers and service folders are excluded, the name-matching exe wins).
 * PNGs are cached in %USERPROFILE%\.app-library\icons\<id>.png. Renderer receives data: URLs.
 * Programs without an icon get `icon: null` and the UI shows a letter placeholder.
 */
const { execFile } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ICON_DIR = path.join(process.env.USERPROFILE || os.homedir(), ".app-library", "icons");
const SUPPORTED_EXTENSIONS = new Set([".exe", ".ico"]);

const PS_SCRIPT = [
  "Add-Type -AssemblyName System.Drawing",
  "$icon = [System.Drawing.Icon]::ExtractAssociatedIcon($env:APPDECK_SRC)",
  "if ($null -eq $icon) { exit 2 }",
  "$bitmap = $icon.ToBitmap()",
  "$bitmap.Save($env:APPDECK_OUT, [System.Drawing.Imaging.ImageFormat]::Png)",
  "$bitmap.Dispose()",
  "$icon.Dispose()",
].join("; ");

// -EncodedCommand avoids every quoting issue with paths that contain spaces.
const ENCODED_SCRIPT = Buffer.from(PS_SCRIPT, "utf16le").toString("base64");

/** Folders that never contain the main executable. */
const SKIP_DIR_NAMES = new Set([
  "uninstall", "uninst", "resources", "locales", "drivers", "redist", "runtimes",
  "eula", "help", "plugins", "bin64-old", "bin32-old", "logs", "cache",
]);

/** Executable names that are service/installer files, not launchers. */
const NON_LAUNCHER_PATTERN = /unins|uninstall|setup|installer|update|crash|elevat|vc_redist|bootstrapper|crashreport/;

function normalizeStem(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z\u0430-\u044f\u04510-9]/gi, "");
}

/** DisplayIcon looks like `"C:\\App\\app.exe,0"`. Returns an existing file or null. */
function resolveDisplayIcon(displayIcon, installLocation) {
  if (!displayIcon) return null;
  let value = String(displayIcon).trim().replace(/^"|"$/g, "").replace(/,\s*-?\d+$/, "");
  value = value.replace(/%([^%]+)%/g, (match, name) => process.env[name] ?? match);
  if (!value) return null;
  if (!path.isAbsolute(value) && installLocation) value = path.join(installLocation, value);
  if (!SUPPORTED_EXTENSIONS.has(path.extname(value).toLowerCase())) return null;
  return fs.existsSync(value) ? value : null;
}

/**
 * Picks the exe from the resolved launch target: strips the ",0" icon index, resolves
 * relative paths against the install folder and accepts only .exe/.ico that exist.
 */
function resolveExecutable(program) {
  let value = typeof program.executable === "string" ? program.executable.trim() : "";
  if (!value) return null;
  value = value.replace(/^"|"$/g, "").replace(/,\s*-?\d+$/, "");
  if (!value) return null;
  if (!path.isAbsolute(value) && program.installLocation) value = path.join(program.installLocation, value);
  if (!SUPPORTED_EXTENSIONS.has(path.extname(value).toLowerCase())) return null;
  return fs.existsSync(value) ? value : null;
}

/**
 * Scans the install folder for a launcher exe (depth 2, service folders skipped).
 * Prefers an exe whose name resembles the program name, then the folder name,
 * then the first non-installer exe found. Returns an existing file or null.
 */
function findLauncherExe(installLocation, programName) {
  if (typeof installLocation !== "string" || !installLocation.trim()) return null;
  let stat;
  try { stat = fs.statSync(installLocation); } catch { return null; }
  if (!stat.isDirectory()) return null;

  const exes = [];
  const scan = (dir, depth) => {
    if (depth > 2 || exes.length > 100) return;
    let items;
    try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const item of items) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) {
        if (!SKIP_DIR_NAMES.has(item.name.toLowerCase())) scan(full, depth + 1);
      } else if (item.name.toLowerCase().endsWith(".exe")) {
        exes.push(full);
      }
    }
  };
  scan(installLocation, 0);
  if (!exes.length) return null;

  const good = exes.filter((p) => !NON_LAUNCHER_PATTERN.test(path.basename(p).toLowerCase()));
  const pool = good.length ? good : exes;
  const stem = normalizeStem(programName).slice(0, 6);
  const folderStem = normalizeStem(path.basename(installLocation)).slice(0, 6);
  const baseOf = (p) => normalizeStem(path.basename(p));
  const nameMatch = stem && pool.find((p) => baseOf(p).includes(stem));
  const folderMatch = folderStem && pool.find((p) => baseOf(p).includes(folderStem));
  return nameMatch ?? folderMatch ?? pool[0];
}

/**
 * Resolves an icon source for a program: DisplayIcon, then the launch target,
 * then a scan of the install folder. Returns an existing file or null.
 */
function resolveIconSource(program) {
  return (
    resolveDisplayIcon(program.displayIcon, program.installLocation) ??
    resolveExecutable(program) ??
    findLauncherExe(program.installLocation, program.name)
  );
}

function iconFileName(id) {
  const safe = String(id).replace(/[^a-z0-9\u0430-\u044f\u0451_-]+/gi, "-").slice(0, 120);
  return `${safe || "app"}.png`;
}

function extractOne(program) {
  const outPath = path.join(ICON_DIR, iconFileName(program.id));
  if (fs.existsSync(outPath)) return Promise.resolve(outPath);

  const source = resolveIconSource(program);
  if (!source) return Promise.resolve(null);

  fs.mkdirSync(ICON_DIR, { recursive: true });
  return new Promise((resolve) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", ENCODED_SCRIPT],
      {
        windowsHide: true,
        timeout: 15000,
        env: { ...process.env, APPDECK_SRC: source, APPDECK_OUT: outPath },
      },
      (error) => resolve(!error && fs.existsSync(outPath) ? outPath : null)
    );
  });
}

function toDataUrl(file) {
  return `data:image/png;base64,${fs.readFileSync(file).toString("base64")}`;
}

/** Runs a small pool so hundreds of PowerShell starts do not run at once. */
async function attachIcons(programs, { concurrency = 4 } = {}) {
  if (process.platform !== "win32") {
    return programs.map((program) => ({ ...program, icon: null }));
  }

  const results = new Array(programs.length).fill(null);
  let next = 0;
  const worker = async () => {
    while (next < programs.length) {
      const index = next;
      next += 1;
      try {
        const file = await extractOne(programs[index]);
        results[index] = file ? toDataUrl(file) : null;
      } catch {
        results[index] = null;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, programs.length) }, worker));
  return programs.map((program, index) => ({ ...program, icon: results[index] }));
}

module.exports = { attachIcons, resolveIconSource, resolveDisplayIcon, iconFileName, ICON_DIR };
