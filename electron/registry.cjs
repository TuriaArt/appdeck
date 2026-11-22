"use strict";

const { execFile, spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const UNINSTALL_KEYS = [
  "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
  "HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
  "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
];

function decodeRegistryOutput(buffer) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    try {
      // Russian Windows console commonly uses OEM code page 866.
      return new TextDecoder("cp866").decode(buffer);
    } catch {
      return new TextDecoder("windows-1251").decode(buffer);
    }
  }
}

function readRegistryKey(key) {
  return new Promise((resolve) => {
    execFile(
      "reg.exe",
      ["query", key, "/s"],
      { windowsHide: true, maxBuffer: 32 * 1024 * 1024, encoding: "buffer" },
      (error, stdout) => {
        if (error) {
          resolve([]);
          return;
        }
        resolve(parseRegOutput(decodeRegistryOutput(stdout)));
      }
    );
  });
}

function parseRegOutput(output) {
  const programs = [];
  let block = null;

  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (/^HKEY_/i.test(line)) {
      if (block && block.DisplayName) programs.push(block);
      block = { _key: line };
      continue;
    }
    if (!block) continue;
    const match = line.match(/^(.*?)\s+(REG_[A-Z_]+)\s+(.*)$/);
    if (!match) continue;
    const [, name, , value] = match;
    if (name) block[name] = value;
  }
  if (block && block.DisplayName) programs.push(block);
  return programs;
}

/**
 * EstimatedSize is REG_DWORD in KB. `reg query` prints it as hex ("0x1a2b").
 * Returns whole megabytes or null.
 */
function parseSizeMB(raw) {
  if (raw === undefined || raw === null || raw === "") return null;
  const text = String(raw).trim();
  const kb = /^0x/i.test(text) ? parseInt(text, 16) : parseInt(text, 10);
  if (!Number.isFinite(kb) || kb <= 0) return null;
  return Math.max(1, Math.round(kb / 1024));
}

/** Only .exe values are launchable; DisplayIcon may point at .ico/.dll, which are not. */
function resolveExecutable(displayIcon) {
  const value = String(displayIcon || "")
    .trim()
    .replace(/^"|"$/g, "")
    .replace(/,\s*-?\d+$/, "")
    .replace(/%([^%]+)%/g, (match, name) => process.env[name] ?? match);
  if (!/\.exe$/i.test(value)) return "";
  // Many installers point DisplayIcon at their uninstaller; "Открыть" must never run it.
  if (/unins|uninst|setup|installer/i.test(path.basename(value))) return "";
  return value;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function parseInstallDate(value) {
  if (!/^\d{8}$/.test(value || "")) return null;
  const iso = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00.000Z`;
  return Number.isNaN(new Date(iso).getTime()) ? null : iso;
}

async function scanInstalledPrograms() {
  const groups = await Promise.all(UNINSTALL_KEYS.map(readRegistryKey));
  const flattened = groups.flat();
  const seen = new Set();
  const usedIds = new Set();
  const programs = [];

  for (const entry of flattened) {
    const name = (entry.DisplayName || "").trim();
    if (!name) continue;
    if (entry.SystemComponent === "0x1") continue;
    if (entry.ReleaseType === "Update" || entry.ParentKeyName) continue;

    const version = entry.DisplayVersion || "";
    const dedupeKey = `${name.toLowerCase()}|${version}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    let id = slugify(name);
    if (usedIds.has(id)) id = `${id}-${slugify(version) || usedIds.size}`;
    usedIds.add(id);

    programs.push({
      id,
      name,
      version,
      publisher: entry.Publisher || "",
      installedAt: parseInstallDate(entry.InstallDate),
      installLocation: (entry.InstallLocation || "").replace(/^"|"$/g, ""),
      uninstallString: entry.UninstallString || "",
      displayIcon: entry.DisplayIcon || "",
      registryKey: entry._key,
      estimatedSizeMB: parseSizeMB(entry.EstimatedSize),
      executable: resolveExecutable(entry.DisplayIcon),
      // category is NOT set here: electron/catalog.cjs merges it from descriptions.json.
    });
  }

  return programs.sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

function tokenizeWindowsCommand(value) {
  const tokens = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (/\s/.test(char) && !quoted) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }
  if (current) tokens.push(current);
  return tokens;
}

/**
 * MSI products must be uninstalled by ProductCode, not by reusing /I.
 * The passive flag keeps the Windows Installer progress UI visible.
 */
function parseUninstallCommand(uninstallString) {
  const command = String(uninstallString || "").trim();
  if (!command) throw new Error("В реестре отсутствует UninstallString");

  const tokens = tokenizeWindowsCommand(command);
  const executable = (tokens[0] || "").toLowerCase();
  const isMsi = /(^|\\)msiexec(?:\.exe)?$/.test(executable);

  if (isMsi) {
    const productCode = command.match(/\{[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}/i)?.[0];
    if (!productCode) throw new Error("Не удалось определить MSI ProductCode");
    const systemRoot = process.env.SystemRoot || "C:\\Windows";
    return {
      file: path.join(systemRoot, "System32", "msiexec.exe"),
      args: ["/x", productCode, "/passive"],
      msi: true,
    };
  }

  if (command.startsWith('"')) {
    const match = command.match(/^"([^"]+)"\s*(.*)$/);
    if (!match) throw new Error("Некорректная команда uninstaller");
    return { file: match[1], args: tokenizeWindowsCommand(match[2]), msi: false };
  }

  // Handle unquoted paths such as C:\Program Files\App\uninstall.exe.
  for (let end = tokens.length; end > 0; end -= 1) {
    const candidate = tokens.slice(0, end).join(" ");
    const executablePath = fs.existsSync(candidate) ? candidate : fs.existsSync(`${candidate}.exe`) ? `${candidate}.exe` : null;
    if (executablePath && fs.statSync(executablePath).isFile()) {
      return { file: executablePath, args: tokens.slice(end), msi: false };
    }
  }

  if (!tokens[0]) throw new Error("Не удалось определить исполняемый файл uninstaller");
  return { file: tokens[0], args: tokens.slice(1), msi: false };
}

/**
 * Native main-process uninstall preparation.
 * Re-reads the registry so a stale renderer cannot supply an arbitrary command.
 * The caller MUST obtain explicit user confirmation before calling this method.
 */
async function uninstall(program) {
  if (!program || typeof program.id !== "string") throw new Error("Не передан идентификатор программы");

  const installed = await scanInstalledPrograms();
  const fresh = installed.find((entry) => entry.id === program.id || (program.registryKey && entry.registryKey === program.registryKey));
  if (!fresh) throw new Error("Программа больше не найдена в реестре. Обновите индекс.");

  const parsed = parseUninstallCommand(fresh.uninstallString);
  if (/\.(cmd|bat)$/i.test(parsed.file)) {
    throw new Error("Uninstaller использует пакетный файл. Запустите его вручную после проверки.");
  }

  // Never use shell.open / shell.openExternal for uninstall commands.
  const child = spawn(parsed.file, parsed.args, {
    windowsHide: false,
    shell: false,
    detached: true,
    stdio: "ignore",
  });

  await new Promise((resolve, reject) => {
    const cleanup = () => {
      child.removeListener("spawn", onSpawn);
      child.removeListener("error", onError);
    };
    const onSpawn = () => { cleanup(); resolve(); };
    const onError = (error) => { cleanup(); reject(error); };
    child.once("spawn", onSpawn);
    child.once("error", onError);
  });

  child.on("error", () => {});
  child.unref();
  return { ok: true, started: true, pid: child.pid, program: fresh };
}

module.exports = {
  UNINSTALL_KEYS,
  parseSizeMB,
  resolveExecutable,
  scanInstalledPrograms,
  parseRegOutput,
  parseUninstallCommand,
  tokenizeWindowsCommand,
  uninstall,
};
