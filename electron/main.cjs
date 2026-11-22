"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { app, BrowserWindow, dialog, ipcMain, net, protocol, shell } = require("electron");
const { execFile } = require("node:child_process");
const { scanInstalledPrograms, uninstall } = require("./registry.cjs");
const { DESCRIPTIONS, REPO_ALLOWLIST, mergeWithCatalog } = require("./catalog.cjs");
const { attachIcons } = require("./icons.cjs");
const { overrideKeyFor, migrateOverrides, screenshotFileName } = require("./overrideKeys.cjs");

const MEDIA_SCHEME = "appdeck-media";
const MEDIA_HOST = "screenshots";
const MAX_DESCRIPTION_LENGTH = 4000;
const MAX_SCREENSHOT_BYTES = 25 * 1024 * 1024;
const SCREENSHOT_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
/** data:image/png;base64,... — the only clipboard payload the paste handler accepts. */
const CLIPBOARD_DATA_URL = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/;
const UNINSTALL_POLL_INTERVAL_MS = 2000;
const UNINSTALL_POLL_TIMEOUT_MS = 90_000;
const NOT_IN_INDEX = "Программа не найдена в индексе. Обновите индекс.";

// The dev renderer runs on http://localhost, where Chromium blocks file:// images.
// Screenshots are served through this scheme instead; webSecurity stays enabled.
protocol.registerSchemesAsPrivileged([
  { scheme: MEDIA_SCHEME, privileges: { standard: true, secure: true } },
]);

/* ------------------------------------------------------------------ */
/* Launch target resolution                                            */
/* ------------------------------------------------------------------ */

/** Resolves a launchable executable from whatever the registry gave us. */
async function resolveLaunchTarget(program) {
  const candidates = [];

  // 1. Executable from the index; strip ",0" icon index from DisplayIcon-derived paths.
  if (typeof program.executable === "string" && program.executable.trim()) {
    candidates.push(program.executable.replace(/,\s*\d+\s*$/, ""));
  }

  // 2. Install location: if it is a folder, find the exe inside (up to 2 levels).
  if (typeof program.installLocation === "string" && program.installLocation.trim()) {
    const base = program.installLocation;
    let stat = null;
    try { stat = await fs.promises.stat(base); } catch { /* gone */ }

    if (stat?.isFile()) {
      candidates.push(base);
    } else if (stat?.isDirectory()) {
      const exes = [];
      const skip = new Set(["uninstall", "uninst", "resources", "locales", "drivers",
        "redist", "runtimes", "eula", "help", "plugins", "bin64-old"]);
      const looksLikeLauncher = (p) => {
        const name = path.basename(p).toLowerCase();
        if (/unins|uninstall|setup|installer|update|crash|elevat|vc_redist/.test(name)) return false;
        return true;
      };
      const scan = async (dir, depth) => {
        if (depth > 2 || exes.length > 100) return;
        let items;
        try { items = await fs.promises.readdir(dir, { withFileTypes: true }); } catch { return; }
        for (const item of items) {
          const full = path.join(dir, item.name);
          if (item.isDirectory()) {
            if (!skip.has(item.name.toLowerCase())) await scan(full, depth + 1);
          } else if (item.name.toLowerCase().endsWith(".exe")) {
            exes.push(full);
          }
        }
      };
      await scan(base, 0);

      if (exes.length) {
        // Prefer an exe whose name resembles the folder or the program name; never an uninstaller.
        const good = exes.filter(looksLikeLauncher);
        const pool = good.length ? good : exes;
        const stem = path.basename(base).toLowerCase().replace(/[^a-zа-я0-9]/gi, "");
        const stemMatch = pool.find((p) => path.basename(p).toLowerCase().includes(stem.slice(0, 6)));
        const nameStem = String(program.name ?? "").toLowerCase().replace(/[^a-zа-я0-9]/gi, "");
        const nameMatch = pool.find((p) => path.basename(p).toLowerCase().includes(nameStem.slice(0, 6)));
        candidates.push(nameMatch ?? stemMatch ?? pool[0]);
      }
    }
  }

  for (const candidate of candidates) {
    try {
      const stat = await fs.promises.stat(candidate);
      if (stat.isFile()) return candidate;
    } catch { /* try next */ }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* MSI + Start Menu fallbacks                                          */
/* ------------------------------------------------------------------ */

/** Cache of MSI fallback lookups keyed by product code: rescan must stay fast. */
const MSI_INFO_CACHE = new Map();

/** Pulls the {GUID} product code out of "MsiExec.exe /X{GUID}". */
function msiProductCode(program) {
  const match = /MsiExec\.exe\s+\/[XIN]\s*\{([0-9A-Fa-f-]{36})\}/i.exec(String(program.uninstallString ?? ""));
  return match ? "{" + match[1] + "}" : null;
}

/** Asks Windows Installer where the product was installed. Empty string on any failure. */
function msiInstallLocation(productCode) {
  return new Promise((resolve) => {
    const script = "(New-Object -ComObject WindowsInstaller.Installer).ProductInfo('" + productCode + "','InstallLocation')";
    execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script],
      { timeout: 15_000, windowsHide: true },
      (error, stdout) => resolve(error ? "" : String(stdout ?? "").trim()));
  });
}

function normalizeName(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-zа-я0-9]/gi, "");
}

/** Finds a Start Menu shortcut whose name resembles the program name; returns its exe target. */
async function findShortcutTarget(programName) {
  const roots = [
    process.env.APPDATA ? path.join(process.env.APPDATA, "Microsoft", "Windows", "Start Menu", "Programs") : null,
    process.env.PROGRAMDATA ? path.join(process.env.PROGRAMDATA, "Microsoft", "Windows", "Start Menu", "Programs") : null,
  ].filter(Boolean);
  const stem = normalizeName(programName).slice(0, 8);
  if (!stem) return null;

  const links = [];
  const scan = async (dir, depth) => {
    if (depth > 3 || links.length > 200) return;
    let items;
    try { items = await fs.promises.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const item of items) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) await scan(full, depth + 1);
      else if (item.name.toLowerCase().endsWith(".lnk")) links.push(full);
    }
  };
  for (const root of roots) await scan(root, 0);

  const matches = links.filter((link) => {
    if (/unins|uninstall/i.test(link)) return false;
    const base = normalizeName(path.basename(link, ".lnk"));
    return base.includes(stem) || stem.includes(base);
  });

  for (const link of matches) {
    try {
      const target = shell.readShortcutLink(link).target;
      if (target && target.toLowerCase().endsWith(".exe") && fs.existsSync(target)) return target;
    } catch { /* broken or non-file shortcut */ }
  }
  return null;
}

/**
 * MSI-registered programs often have no InstallLocation/executable in the uninstall key.
 * Asks Windows Installer for the real folder, then falls back to the Start Menu shortcut.
 * Results are cached: the answers never change between rescans.
 */
async function enrichMissingPaths(programs) {
  for (const program of programs) {
    const hasLocation = typeof program.installLocation === "string" && program.installLocation.trim();
    const hasExecutable = typeof program.executable === "string" && program.executable.trim();
    if (hasLocation && hasExecutable) continue;
    const code = msiProductCode(program);
    if (!code) continue;

    let info = MSI_INFO_CACHE.get(code);
    if (!info) {
      info = { location: await msiInstallLocation(code), shortcut: null };
      if (!info.location) info.shortcut = await findShortcutTarget(program.name);
      MSI_INFO_CACHE.set(code, info);
    }
    if (!hasLocation && info.location && fs.existsSync(info.location)) {
      program.installLocation = info.location;
    }
    if (!hasExecutable && info.shortcut && fs.existsSync(info.shortcut)) {
      program.executable = info.shortcut;
    }
  }
  return programs;
}
let mainWindow = null;
/** Last scan result. Every IPC handler validates requests against this list. */
let lastScan = [];
/** Lazy cache of overrides.json: { [programId]: { description?, screenshot? } }. */
let overridesCache = null;
const uninstallWatchers = new Set();

/* ------------------------------------------------------------------ */
/* User overrides (description + screenshot) stored in userData        */
/* ------------------------------------------------------------------ */

function overridesFile() {
  return path.join(app.getPath("userData"), "overrides.json");
}

function screenshotsDir() {
  return path.join(app.getPath("userData"), "screenshots");
}

function sanitizeOverrides(data) {
  const clean = Object.create(null);
  if (!data || typeof data !== "object" || Array.isArray(data)) return clean;
  for (const [programId, value] of Object.entries(data)) {
    if (!value || typeof value !== "object") continue;
    const entry = {};
    if (typeof value.description === "string" && value.description.trim()) {
      entry.description = value.description.slice(0, MAX_DESCRIPTION_LENGTH);
    }
    if (typeof value.screenshot === "string" && value.screenshot) {
      entry.screenshot = path.basename(value.screenshot);
    }
    if (Object.keys(entry).length > 0) clean[programId] = entry;
  }
  return clean;
}

function loadOverrides() {
  if (overridesCache) return overridesCache;
  const file = overridesFile();
  let raw = null;
  try {
    raw = fs.readFileSync(file, "utf8");
  } catch {
    // No file yet: first run.
  }
  if (raw === null) {
    overridesCache = Object.create(null);
    return overridesCache;
  }
  try {
    overridesCache = sanitizeOverrides(JSON.parse(raw));
  } catch {
    // Broken JSON must not crash the app. Keep the file aside so nothing is lost silently.
    try {
      fs.renameSync(file, `${file}.corrupt-${Date.now()}`);
    } catch {
      // Ignore: the next save replaces the file anyway.
    }
    overridesCache = Object.create(null);
  }
  return overridesCache;
}

/** Atomic save: write a temp file next to the target, then rename over it. */
function saveOverrides() {
  const file = overridesFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(loadOverrides(), null, 2)}\n`, "utf8");
  fs.renameSync(temporary, file);
}

/**
 * Applies a change to one record and persists it; rolls the cache back on failure.
 * `key` is overrideKeyFor(program): the registry key, or the name-based id as a fallback.
 */
function commitOverride(key, mutate) {
  const overrides = loadOverrides();
  const previous = overrides[key];
  const next = { ...(previous ?? {}) };
  mutate(next);
  if (Object.keys(next).length > 0) overrides[key] = next;
  else delete overrides[key];
  try {
    saveOverrides();
  } catch (error) {
    if (previous) overrides[key] = previous;
    else delete overrides[key];
    throw error;
  }
}

/**
 * Old versions stored edits under the name-based program id. Moves them to the registry key
 * (matched by name), deletes the old records and saves once. Runs on every scan; after the
 * first one there is nothing left to move.
 */
function migrateLegacyOverrides(programs) {
  const overrides = loadOverrides();
  const { moved, discardedScreenshots } = migrateOverrides(overrides, programs);
  if (moved.length === 0) return;
  try {
    saveOverrides();
  } catch {
    // Disk write failed: the in-memory result is already consistent and the next scan
    // (or the next successful save) persists it.
    return;
  }
  const stillUsed = new Set(Object.values(overrides).map((entry) => entry.screenshot).filter(Boolean));
  for (const fileName of discardedScreenshots) {
    if (!stillUsed.has(fileName)) removeScreenshotFile(fileName);
  }
}

/** URL the renderer can load. Null when the stored file no longer exists. */
function screenshotUrl(fileName) {
  if (typeof fileName !== "string" || !fileName) return null;
  const name = path.basename(fileName);
  try {
    const stat = fs.statSync(path.join(screenshotsDir(), name));
    if (!stat.isFile()) return null;
    // ?v= changes whenever the file is replaced, so the renderer never shows a cached image.
    return `${MEDIA_SCHEME}://${MEDIA_HOST}/${encodeURIComponent(name)}?v=${Math.round(stat.mtimeMs)}`;
  } catch {
    return null;
  }
}

function removeScreenshotFile(fileName) {
  if (typeof fileName !== "string" || !fileName) return;
  try {
    fs.unlinkSync(path.join(screenshotsDir(), path.basename(fileName)));
  } catch {
    // Already gone.
  }
}

/** Overlays the user's description and screenshot on a scanned program. */
function applyOverrides(program) {
  const next = { ...program };
  delete next.description;
  delete next.screenshot;
  const entry = loadOverrides()[overrideKeyFor(program)];
  if (!entry) return next;
  if (typeof entry.description === "string") next.description = entry.description;
  const screenshot = screenshotUrl(entry.screenshot);
  if (screenshot) next.screenshot = screenshot;
  return next;
}

function registerMediaProtocol() {
  protocol.handle(MEDIA_SCHEME, (request) => {
    try {
      const url = new URL(request.url);
      if (url.hostname !== MEDIA_HOST) return new Response("Not found", { status: 404 });
      // basename() drops any directory part, so the request cannot leave the screenshots folder.
      const name = path.basename(decodeURIComponent(url.pathname));
      if (!SCREENSHOT_EXTENSIONS.has(path.extname(name).toLowerCase())) {
        return new Response("Not found", { status: 404 });
      }
      const directory = screenshotsDir();
      const file = path.join(directory, name);
      if (!file.startsWith(directory + path.sep) || !fs.existsSync(file)) {
        return new Response("Not found", { status: 404 });
      }
      return net.fetch(pathToFileURL(file).toString());
    } catch {
      return new Response("Bad request", { status: 400 });
    }
  });
}

/* ------------------------------------------------------------------ */
/* Window + scan                                                       */
/* ------------------------------------------------------------------ */

function createWindow() {
  // A packaged app keeps the icon in resources (extraResources); dev falls back to build/.
  const windowIcon = fs.existsSync(path.join(process.resourcesPath, "icon.ico"))
    ? path.join(process.resourcesPath, "icon.ico")
    : path.join(__dirname, "../build/icon.ico");

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: "#121212",
    title: "AppDeck",
    icon: windowIcon,
    titleBarStyle: "hidden",
    titleBarOverlay: { color: "#121212", symbolColor: "#c7cede", height: 40 },
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function assertTrustedSender(event) {
  if (!mainWindow || event.sender !== mainWindow.webContents) {
    throw new Error("Недоверенный источник команды");
  }
}

function findScanned(predicate) {
  return lastScan.find(predicate) ?? null;
}

/** Registry scan → catalog categories → icons → user overrides. */
async function runScan() {
  const scanned = await enrichMissingPaths(mergeWithCatalog(await scanInstalledPrograms()));
  migrateLegacyOverrides(scanned);
  const withIcons = await attachIcons(scanned);
  lastScan = withIcons.map(applyOverrides);
  return lastScan;
}

/**
 * After an uninstaller starts, polls the registry until the program disappears,
 * then rescans and pushes the new list to the window. Gives up after the timeout:
 * a slow uninstaller simply leaves the manual «Обновить» button.
 */
function watchUninstall(programId) {
  if (uninstallWatchers.has(programId)) return;
  uninstallWatchers.add(programId);
  const startedAt = Date.now();

  const tick = async () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      uninstallWatchers.delete(programId);
      return;
    }
    try {
      const installed = await scanInstalledPrograms();
      if (!installed.some((entry) => entry.id === programId)) {
        uninstallWatchers.delete(programId);
        await runScan();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("registry:updated", lastScan);
        }
        return;
      }
    } catch {
      // A failed poll is not fatal; try again on the next tick.
    }
    if (Date.now() - startedAt >= UNINSTALL_POLL_TIMEOUT_MS) {
      uninstallWatchers.delete(programId);
      return;
    }
    setTimeout(tick, UNINSTALL_POLL_INTERVAL_MS);
  };

  setTimeout(tick, UNINSTALL_POLL_INTERVAL_MS);
}

/* ------------------------------------------------------------------ */
/* IPC                                                                 */
/* ------------------------------------------------------------------ */

ipcMain.handle("registry:scan", async (event) => {
  assertTrustedSender(event);
  return runScan();
});

ipcMain.handle("app:launch", async (event, programId) => {
  assertTrustedSender(event);
  const program = findScanned((entry) => entry.id === programId);
  if (!program) return { ok: false, error: NOT_IN_INDEX };

  const target = await resolveLaunchTarget(program);
  if (!target) {
    return { ok: false, error: "Не найден исполняемый файл — откройте папку вручную" };
  }
  const error = await shell.openPath(target);
  return error ? { ok: false, error } : { ok: true };
});

ipcMain.handle("app:reveal", async (event, installLocation) => {
  assertTrustedSender(event);
  const allowed = findScanned((entry) => entry.installLocation === installLocation);
  if (!allowed || !installLocation) return { ok: false, error: "Путь не найден в проиндексированных приложениях" };
  shell.showItemInFolder(installLocation);
  return { ok: true };
});

ipcMain.handle("app:web-search", async (event, query) => {
  assertTrustedSender(event);
  if (typeof query !== "string" || query.length > 300) return { ok: false, error: "Некорректный поисковый запрос" };
  await shell.openExternal(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
  return { ok: true };
});

ipcMain.handle("app:open-external", async (event, url) => {
  assertTrustedSender(event);
  if (typeof url !== "string" || !REPO_ALLOWLIST.has(url)) {
    return { ok: false, error: "Ссылка отсутствует в проверенном каталоге" };
  }
  await shell.openExternal(url);
  return { ok: true };
});

ipcMain.handle("app:uninstall", async (event, programId) => {
  assertTrustedSender(event);
  if (typeof programId !== "string") return { ok: false, error: "Некорректный идентификатор программы" };

  const program = findScanned((entry) => entry.id === programId)
    ?? (await scanInstalledPrograms()).find((entry) => entry.id === programId);
  if (!program) return { ok: false, error: "Программа не найдена в реестре. Обновите индекс." };

  // Single confirmation lives in the renderer (UninstallDialog, text from the spec).
  // This handler is only reachable after the user pressed «Удалить» there.
  try {
    // registry.cjs re-reads UninstallString and uses child_process.spawn, never shell.open.
    const result = await uninstall(program);
    if (result.started === true) watchUninstall(program.id);
    return { ok: true, started: result.started, pid: result.pid };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Не удалось запустить uninstaller" };
  }
});

ipcMain.handle("app:find-alternatives", async (event, programName) => {
  assertTrustedSender(event);
  if (typeof programName !== "string") return [];
  // TODO: в Electron-версии вместо статического списка — запрос к API поиска
  // или локальной базе соответствий. Сейчас возвращаем проверенный каталог.
  return DESCRIPTIONS[programName]?.alternatives ?? [];
});

ipcMain.handle("app:update-description", async (event, programId, text) => {
  assertTrustedSender(event);
  if (typeof programId !== "string" || !programId || typeof text !== "string") {
    return { ok: false, error: "Некорректные данные описания" };
  }
  if (text.length > MAX_DESCRIPTION_LENGTH) {
    return { ok: false, error: `Описание длиннее ${MAX_DESCRIPTION_LENGTH} символов` };
  }
  const program = findScanned((entry) => entry.id === programId);
  if (!program) return { ok: false, error: NOT_IN_INDEX };

  // An empty text removes the user's edit and brings back the catalog description.
  const description = text.trim();
  try {
    commitOverride(overrideKeyFor(program), (entry) => {
      if (description) entry.description = description;
      else delete entry.description;
    });
  } catch {
    return { ok: false, error: "Не удалось сохранить описание на диск" };
  }

  if (description) program.description = description;
  else delete program.description;
  return { ok: true, description: description || null };
});

ipcMain.handle("app:choose-screenshot", async (event, programId) => {
  assertTrustedSender(event);
  if (typeof programId !== "string" || !programId) {
    return { ok: false, error: "Некорректный идентификатор программы" };
  }
  const program = findScanned((entry) => entry.id === programId);
  if (!program) return { ok: false, error: NOT_IN_INDEX };

  const selection = await dialog.showOpenDialog(mainWindow, {
    title: `Скриншот для ${program.name}`,
    properties: ["openFile"],
    filters: [{ name: "Изображения", extensions: ["png", "jpg", "jpeg", "webp"] }],
  });
  if (selection.canceled || !selection.filePaths || !selection.filePaths[0]) {
    return { ok: false, error: "cancelled" };
  }

  const source = selection.filePaths[0];
  const extension = path.extname(source).toLowerCase();
  if (!SCREENSHOT_EXTENSIONS.has(extension)) {
    return { ok: false, error: "Поддерживаются только PNG, JPG и WebP" };
  }

  try {
    const stat = await fs.promises.stat(source);
    if (!stat.isFile()) return { ok: false, error: "Выбранный объект не является файлом" };
    if (stat.size > MAX_SCREENSHOT_BYTES) return { ok: false, error: "Файл больше 25 МБ" };

    // Copy into userData: the card must survive the user moving or deleting the original.
    const directory = screenshotsDir();
    await fs.promises.mkdir(directory, { recursive: true });
    const key = overrideKeyFor(program);
    const fileName = screenshotFileName(loadOverrides(), key, programId, extension);
    const target = path.join(directory, fileName);
    const temporary = `${target}.${process.pid}.tmp`;
    await fs.promises.copyFile(source, temporary);
    await fs.promises.rename(temporary, target);
    const now = new Date();
    await fs.promises.utimes(target, now, now);

    const previousFile = loadOverrides()[key]?.screenshot;
    commitOverride(key, (entry) => {
      entry.screenshot = fileName;
    });
    if (previousFile && previousFile !== fileName) removeScreenshotFile(previousFile);

    const screenshot = screenshotUrl(fileName);
    if (!screenshot) return { ok: false, error: "Не удалось сохранить скриншот" };
    // lastScan may have been replaced while the dialog was open.
    const current = findScanned((entry) => entry.id === programId);
    if (current) current.screenshot = screenshot;
    return { ok: true, screenshot };
  } catch {
    return { ok: false, error: "Не удалось сохранить скриншот" };
  }
});

// Paste from the clipboard: the renderer sends a data URL, main decodes it and
// stores the image exactly like the file dialog does (same folder, same override).
ipcMain.handle("app:save-screenshot-clipboard", async (event, programId, dataUrl) => {
  assertTrustedSender(event);
  if (typeof programId !== "string" || !programId) {
    return { ok: false, error: "Некорректный идентификатор программы" };
  }
  const program = findScanned((entry) => entry.id === programId);
  if (!program) return { ok: false, error: NOT_IN_INDEX };
  if (typeof dataUrl !== "string") return { ok: false, error: "В буфере обмена нет изображения" };

  const match = CLIPBOARD_DATA_URL.exec(dataUrl);
  if (!match) {
    return { ok: false, error: "В буфере обмена нет поддерживаемого изображения (PNG, JPEG или WebP)" };
  }
  const extension = match[1] === "jpeg" ? ".jpg" : `.${match[1]}`;
  let buffer;
  try {
    buffer = Buffer.from(match[2], "base64");
  } catch {
    return { ok: false, error: "Не удалось прочитать изображение из буфера" };
  }
  if (buffer.length === 0) return { ok: false, error: "Изображение в буфере пустое" };
  if (buffer.length > MAX_SCREENSHOT_BYTES) return { ok: false, error: "Изображение больше 25 МБ" };

  try {
    const directory = screenshotsDir();
    await fs.promises.mkdir(directory, { recursive: true });
    const key = overrideKeyFor(program);
    const fileName = screenshotFileName(loadOverrides(), key, programId, extension);
    const target = path.join(directory, fileName);
    const temporary = `${target}.${process.pid}.tmp`;
    await fs.promises.writeFile(temporary, buffer);
    await fs.promises.rename(temporary, target);
    const now = new Date();
    await fs.promises.utimes(target, now, now);

    const previousFile = loadOverrides()[key]?.screenshot;
    commitOverride(key, (entry) => {
      entry.screenshot = fileName;
    });
    if (previousFile && previousFile !== fileName) removeScreenshotFile(previousFile);

    const screenshot = screenshotUrl(fileName);
    if (!screenshot) return { ok: false, error: "Не удалось сохранить скриншот" };
    const current = findScanned((entry) => entry.id === programId);
    if (current) current.screenshot = screenshot;
    return { ok: true, screenshot };
  } catch {
    return { ok: false, error: "Не удалось сохранить скриншот из буфера" };
  }
});

ipcMain.handle("app:remove-screenshot", async (event, programId) => {
  assertTrustedSender(event);
  if (typeof programId !== "string" || !programId) {
    return { ok: false, error: "Некорректный идентификатор программы" };
  }
  const program = findScanned((entry) => entry.id === programId);
  if (!program) return { ok: false, error: NOT_IN_INDEX };

  const key = overrideKeyFor(program);
  const previousFile = loadOverrides()[key]?.screenshot;
  try {
    commitOverride(key, (entry) => {
      delete entry.screenshot;
    });
  } catch {
    return { ok: false, error: "Не удалось сохранить изменения на диск" };
  }
  removeScreenshotFile(previousFile);
  delete program.screenshot;
  return { ok: true };
});

app.whenReady().then(() => {
  registerMediaProtocol();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});