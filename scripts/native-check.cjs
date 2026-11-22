"use strict";

// Node-level checks for the Electron modules and the curated catalog. Run: node scripts/native-check.cjs
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { parseUninstallCommand, parseRegOutput, tokenizeWindowsCommand, parseSizeMB, resolveExecutable } = require("../electron/registry.cjs");
const { mergeWithCatalog, findCatalogEntry, DESCRIPTIONS, REPO_ALLOWLIST } = require("../electron/catalog.cjs");
const { resolveIconSource } = require("../electron/icons.cjs");

const guid = "{12345678-1234-1234-1234-123456789ABC}";

// --- uninstall command parsing
const msi = parseUninstallCommand(`MsiExec.exe /I${guid}`);
assert.deepStrictEqual(msi.args, ["/x", guid, "/passive"]);
assert.strictEqual(msi.msi, true);
const quoted = parseUninstallCommand('"C:\\Program Files\\App\\unins000.exe" /SILENT');
assert.strictEqual(quoted.file, "C:\\Program Files\\App\\unins000.exe");
assert.deepStrictEqual(quoted.args, ["/SILENT"]);
assert.deepStrictEqual(tokenizeWindowsCommand('a "b c" d'), ["a", "b c", "d"]);

// --- registry text parsing
const sample = [
  "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Test",
  "    DisplayName    REG_SZ    Test App",
  "    DisplayVersion    REG_SZ    1.2.3",
  "    EstimatedSize    REG_DWORD    0x1a2b",
  `    UninstallString    REG_SZ    MsiExec.exe /I${guid}`,
  "",
].join("\r\n");
const parsed = parseRegOutput(sample);
assert.strictEqual(parsed.length, 1);
assert.strictEqual(parsed[0].EstimatedSize, "0x1a2b");

// --- EstimatedSize: hex DWORD in KB -> whole MB
assert.strictEqual(parseSizeMB("0x1a2b"), 7); // 6699 KB / 1024 = 6.5 -> 7
assert.strictEqual(parseSizeMB("0x100000"), 1024); // 1 GB
assert.strictEqual(parseSizeMB("0x0"), null);
assert.strictEqual(parseSizeMB(undefined), null);
assert.strictEqual(parseSizeMB("1024"), 1);
assert.strictEqual(parseSizeMB("garbage"), null);

// --- launch target from DisplayIcon
assert.strictEqual(resolveExecutable('"C:\\App\\app.exe,0"'), "C:\\App\\app.exe");
assert.strictEqual(resolveExecutable("C:\\App\\app.exe"), "C:\\App\\app.exe");
assert.strictEqual(resolveExecutable("C:\\App\\icons.ico"), "");
assert.strictEqual(resolveExecutable(""), "");
assert.strictEqual(resolveExecutable('"C:\\App\\unins000.exe,0"'), "", "uninstaller must not be a launch target");
assert.strictEqual(resolveExecutable("C:\\App\\Uninstall.exe"), "");

// --- icon source: unsupported or missing files are rejected
assert.strictEqual(resolveIconSource("C:\\nope\\missing.exe,0", ""), null);
assert.strictEqual(resolveIconSource("C:\\App\\lib.dll,2", ""), null);

// --- scan -> catalog matching (category + catalogName)
const cases = [
  ["7-Zip 26.04 (x64 edition)", "7-Zip", "system"],
  ["Python 3.10.11 (64-bit)", "Python 3.10", "dev"],
  ["Microsoft Visual Studio Code", "Microsoft Visual Studio Code", "dev"],
  ["Windows SDK AddOn 10.1.0.0", "Windows SDK AddOn", "dev"],
  ["Windows SDK 10.1.26100.9457", "Windows SDK", "dev"],
  ["Microsoft .NET SDK 10.0.404 (x64)", "Microsoft .NET SDK 10.0.404", "dev"],
  ["Everything 1.4.1.1032", "Everything", "system"],
  ["Google Chrome", null, "other"], // must NOT inherit Google's entry
  ["Git Credential Manager", null, "other"], // must NOT inherit Git's entry
  ["Unknown Vendor Tool", null, "other"],
];
for (const [scanned, expectedName, expectedCategory] of cases) {
  const [merged] = mergeWithCatalog([{ id: "x", name: scanned }]);
  assert.strictEqual(merged.catalogName, expectedName, `catalogName for "${scanned}"`);
  assert.strictEqual(merged.category, expectedCategory, `category for "${scanned}"`);
}
assert.strictEqual(findCatalogEntry("Git")?.name, "Git");

// --- catalog invariants
const descriptions = DESCRIPTIONS;
const names = Object.keys(descriptions).filter((key) => key !== "_comment");
const VALID_CATEGORIES = new Set(["craft", "dev", "audio", "graphics", "ai", "system", "internet", "security", "other"]);
const norm = (value) => value.toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9]+/g, " ").trim();
assert.strictEqual(names.length, 151, "147 prototype + 4 added records");
let nullDescriptions = 0;
for (const name of names) {
  const entry = descriptions[name];
  assert.ok(VALID_CATEGORIES.has(entry.category), `category of ${name}`);
  assert.strictEqual(typeof entry.isOpensource, "boolean", `isOpensource of ${name}`);
  assert.ok(entry.repoUrl === null || String(entry.repoUrl).startsWith("https://"), `repoUrl of ${name}`);
  assert.ok(entry.alternatives.length === 0 || (entry.alternatives.length >= 2 && entry.alternatives.length <= 4), `alternatives count of ${name}`);
  for (const alternative of entry.alternatives) {
    assert.notStrictEqual(norm(alternative), norm(name), `self-reference in ${name}`);
    assert.ok(descriptions[alternative] || alternative, `detail for ${alternative}`);
  }
  if (entry.description === null) nullDescriptions += 1;
}
assert.strictEqual(nullDescriptions, 23, "19 original unknowns + Arturia Pure SUB + 3 new unknowns");
assert.strictEqual(descriptions["Everything"].isOpensource, false);
assert.strictEqual(descriptions["Everything"].repoUrl, "https://www.voidtools.com/");
assert.strictEqual(descriptions["Sigma File Manager"].isOpensource, true);
assert.strictEqual(descriptions["Sigma File Manager"].repoUrl, "https://github.com/aleksey-hoffman/sigma-file-manager");
assert.strictEqual(descriptions["Arturia Pure SUB"].description, null);
assert.strictEqual(descriptions["Jonas Eriksson Phase Fiasco Bundle"].repoUrl, null);
assert.strictEqual(descriptions["Bitwig Studio"].isOpensource, false);
for (const name of ["Trilium Notes", "OxidVault", "SpaceWalk", "TiXL-RU"]) assert.ok(descriptions[name], name);
assert.ok(REPO_ALLOWLIST.has("https://github.com/zadam/trilium"));
for (const name of ["Microsoft .NET SDK 10.0.201", "Microsoft .NET SDK 10.0.404", "Microsoft .NET SDK 9.0.203", "Microsoft .NET SDK 9.0.321"]) {
  assert.deepStrictEqual(descriptions[name].alternatives, [], name);
}

// --- restored brand homepages (closed-source: kept in data/allowlist, no GitHub button in UI)
const RESTORED = {
  "Punto Switcher": "https://yandex.ru/soft/punto/",
  "Paintstorm Studio": "https://paintstormstudio.com",
  "HY-Plugins Sequencer Bundle": "https://hy-plugins.com",
  "Imaginando Colapso": "https://imaginando.pt",
  "Melody Sauce 3": "https://www.evabeat.com",
  "Instacomposer 3": "https://www.waproduction.com",
  "MorningDAW": "https://morningdewmedia.com",
};
for (const [name, url] of Object.entries(RESTORED)) {
  assert.strictEqual(descriptions[name].repoUrl, url, `restored link of ${name}`);
  assert.strictEqual(descriptions[name].isOpensource, false, `${name} stays closed-source`);
}
for (const name of ["Jonas Eriksson Phase Fiasco Bundle", "Realistic Paint Studio", "HiBit Uninstaller", "PhotoScape X Pro", "Arturia Pure SUB"]) {
  assert.strictEqual(descriptions[name].repoUrl, null, `${name} stays null`);
}

// --- uninstall: exactly one confirmation, in the renderer
const mainSrc = fs.readFileSync(path.join(__dirname, "../electron/main.cjs"), "utf8");
assert.ok(!/showMessageBox/.test(mainSrc), "main.cjs must not show a native confirmation");
// dialog is allowed for exactly one thing: the screenshot file picker.
const dialogCalls = mainSrc.match(/\bdialog\.\w+/g) ?? [];
assert.ok(dialogCalls.length > 0 && dialogCalls.every((call) => call === "dialog.showOpenDialog"), "dialog is used only for showOpenDialog");

// --- IPC surface: every handler validates the sender; window hardening is intact
const preloadSrc = fs.readFileSync(path.join(__dirname, "../electron/preload.cjs"), "utf8");
const CHANNELS = [
  "registry:scan", "app:launch", "app:reveal", "app:web-search", "app:open-external", "app:uninstall",
  "app:find-alternatives", "app:update-description", "app:choose-screenshot", "app:remove-screenshot",
];
const handlerStarts = [...mainSrc.matchAll(/ipcMain\.handle\("([^"]+)"/g)].map((match) => ({ channel: match[1], index: match.index }));
assert.deepStrictEqual(handlerStarts.map((item) => item.channel).sort(), [...CHANNELS].sort(), "unexpected set of IPC channels");
handlerStarts.forEach((item, position) => {
  const body = mainSrc.slice(item.index, handlerStarts[position + 1]?.index ?? mainSrc.length);
  assert.ok(body.includes("assertTrustedSender(event)"), `${item.channel} must validate the sender`);
});
assert.ok(/contextIsolation: true/.test(mainSrc) && /nodeIntegration: false/.test(mainSrc) && /sandbox: true/.test(mainSrc), "window hardening");
assert.ok(!/webSecurity\s*:/.test(mainSrc), "webSecurity must stay at its default (enabled)");
assert.ok(!/\beval\s*\(|new Function\s*\(/.test(mainSrc + preloadSrc), "no eval");
assert.ok(mainSrc.includes("MAX_DESCRIPTION_LENGTH = 4000"), "description limit");
assert.ok(/protocol\.handle\(MEDIA_SCHEME/.test(mainSrc) && /path\.basename\(decodeURIComponent/.test(mainSrc), "media protocol strips directories");
assert.ok(/fs\.renameSync\(temporary, file\)/.test(mainSrc), "overrides are saved atomically");
assert.ok(/webContents\.send\("registry:updated"/.test(mainSrc), "auto-refresh push after uninstall");
for (const method of ["updateDescription", "chooseScreenshot", "removeScreenshot", "onRegistryUpdated"]) {
  assert.ok(new RegExp(`\\b${method}:`).test(preloadSrc), `preload exposes ${method}`);
}
assert.ok(!/ipcRenderer\s*[,}]/.test(preloadSrc.slice(preloadSrc.indexOf("exposeInMainWorld"))), "ipcRenderer itself is never exposed");

// --- renderer never touches the file system or Node directly
const rendererDir = path.join(__dirname, "../src");
const rendererFiles = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) rendererFiles.push(full);
  }
})(rendererDir);
for (const file of rendererFiles) {
  const source = fs.readFileSync(file, "utf8");
  // Real import statements only: ElectronGuide.tsx shows require(...) inside code-sample strings.
  assert.ok(
    !/^import[^;]*from\s+"(node:[^"]*|fs|path|os|child_process|electron)"/m.test(source),
    `${path.relative(rendererDir, file)} must not import Node/Electron`
  );
  assert.ok(!/\beval\s*\(/.test(source), `${path.relative(rendererDir, file)} must not use eval`);
}
const modalSrc = fs.readFileSync(path.join(rendererDir, "components/ProgramModal.tsx"), "utf8");
assert.ok(!modalSrc.includes("TODO: screenshot"), "placeholder TODO comment is removed from the card");

// --- dev launcher: no direct .cmd spawn (EINVAL on Node >= 22.12 / Windows)
const devSrc = fs.readFileSync(path.join(__dirname, "electron-dev.mjs"), "utf8");
assert.ok(!/["'`]npx\.cmd["'`]/.test(devSrc), "electron-dev must not spawn npx.cmd directly");
assert.ok(devSrc.includes('shell: process.platform === "win32"'), "electron-dev runs npx through the shell on Windows");
const uninstallHandler = mainSrc.slice(mainSrc.indexOf('"app:uninstall"'), mainSrc.indexOf('"app:find-alternatives"'));
assert.ok(/await uninstall\(program\)/.test(uninstallHandler), "handler still launches the uninstaller");
assert.ok(/assertTrustedSender\(event\)/.test(uninstallHandler), "handler still validates the sender");
const dialogSrc = fs.readFileSync(path.join(__dirname, "../src/components/UninstallDialog.tsx"), "utf8");
assert.ok(dialogSrc.includes("Это действие нельзя отменить. Запустится uninstaller программы"), "spec text in renderer dialog");
const appSrc = fs.readFileSync(path.join(__dirname, "../src/App.tsx"), "utf8");
const requestBody = appSrc.slice(appSrc.indexOf("const requestUninstall"), appSrc.indexOf("const confirmUninstall"));
assert.ok(/setUninstallProgram\(program\)/.test(requestBody) && !/appDeck\.uninstall/.test(requestBody), "menu click only opens the dialog");
const confirmBody = appSrc.slice(appSrc.indexOf("const confirmUninstall"), appSrc.indexOf("const resetFilters"));
assert.ok(/appDeck\.uninstall/.test(confirmBody), "native uninstall is called only from the confirm handler");

// --- user edits are bound to the registry key (they survive a rename); the name id is the fallback
const { overrideKeyFor, migrateOverrides, screenshotFileName } = require("../electron/overrideKeys.cjs");
const HK = "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\7-Zip";
const bag = (data) => Object.assign(Object.create(null), data);

assert.strictEqual(overrideKeyFor({ id: "7-zip-26-04", registryKey: HK }), HK.toLowerCase());
assert.strictEqual(
  overrideKeyFor({ id: "7-zip-26-04", registryKey: HK }),
  overrideKeyFor({ id: "7-zip-26-05-x64", registryKey: HK.toUpperCase() }),
  "a renamed program (new id) keeps the same key; case does not matter"
);
for (const empty of ["", "   ", undefined, null]) {
  assert.strictEqual(overrideKeyFor({ id: "name-only", registryKey: empty }), "name-only", `empty RegistryKey (${JSON.stringify(empty)}) falls back to the name id`);
}
assert.ok(!/\\/.test("7-zip-26-04") && HK.includes("\\"), "a name id can never collide with a registry key");

{
  const overrides = bag({
    "7-zip-26-04": { description: "мой текст", screenshot: "7-zip-26-04.png" },
    "no-key-app": { description: "остаётся под именем" },
    "ghost-program": { description: "программы нет в реестре" },
  });
  const programs = [{ id: "7-zip-26-04", registryKey: HK }, { id: "no-key-app", registryKey: "" }];
  const first = migrateOverrides(overrides, programs);
  assert.deepStrictEqual(first.moved, [{ from: "7-zip-26-04", to: HK.toLowerCase() }]);
  assert.deepStrictEqual(overrides[HK.toLowerCase()], { description: "мой текст", screenshot: "7-zip-26-04.png" }, "record moved intact");
  assert.strictEqual(overrides["7-zip-26-04"], undefined, "old record is deleted");
  assert.deepStrictEqual(overrides["no-key-app"], { description: "остаётся под именем" }, "no registry key: the name record stays");
  assert.deepStrictEqual(overrides["ghost-program"], { description: "программы нет в реестре" }, "record of an uninstalled program is untouched");
  const snapshot = JSON.stringify(overrides);
  assert.deepStrictEqual(migrateOverrides(overrides, programs).moved, [], "second run moves nothing");
  assert.strictEqual(JSON.stringify(overrides), snapshot, "migration is idempotent");

  // the program is renamed afterwards: same registry key, new id → the record is still found
  const renamed = { id: "7-zip-26-05-x64-edition", registryKey: HK };
  assert.deepStrictEqual(overrides[overrideKeyFor(renamed)], { description: "мой текст", screenshot: "7-zip-26-04.png" });
}
{
  const conflict = bag({
    "7-zip-26-04": { description: "старое", screenshot: "old.png" },
    [HK.toLowerCase()]: { description: "новое", screenshot: "new.png" },
  });
  const result = migrateOverrides(conflict, [{ id: "7-zip-26-04", registryKey: HK }]);
  assert.deepStrictEqual(conflict[HK.toLowerCase()], { description: "новое", screenshot: "new.png" }, "the registry-key record wins");
  assert.strictEqual(conflict["7-zip-26-04"], undefined);
  assert.deepStrictEqual(result.discardedScreenshots, ["old.png"], "the losing screenshot is reported for deletion");
}
assert.strictEqual(screenshotFileName(bag({}), "k1", "7-zip", ".PNG"), "7-zip.png", "<programId><ext>");
{
  const owned = bag({ "k-other": { screenshot: "7-zip.png" } });
  const name = screenshotFileName(owned, "k-mine", "7-zip", ".png");
  assert.notStrictEqual(name.toLowerCase(), "7-zip.png", "another record's picture is never overwritten");
  assert.match(name, /^7-zip-[0-9a-f]{8}\.png$/);
  assert.strictEqual(screenshotFileName(bag({ "k-mine": { screenshot: "7-zip.png" } }), "k-mine", "7-zip", ".png"), "7-zip.png", "own file is reused");
}
const keysSource = fs.readFileSync(path.join(__dirname, "../electron/overrideKeys.cjs"), "utf8");
assert.ok(!/require\("electron"\)/.test(keysSource), "overrideKeys.cjs stays free of Electron");
assert.ok(!/loadOverrides\(\)\[programId\]|commitOverride\(programId|overrides\[programId\]/.test(mainSrc), "main.cjs no longer keys edits by the name-based id");
assert.ok(/migrateOverrides\(/.test(mainSrc) && /migrateLegacyOverrides\(scanned\)/.test(mainSrc), "migration runs inside the scan");
assert.ok((mainSrc.match(/overrideKeyFor\(/g) ?? []).length >= 5, "all override reads and writes go through overrideKeyFor");

// --- static program list and descriptions.json must agree on categories
const programsSrc = fs.readFileSync(path.join(__dirname, "../src/data/programs.ts"), "utf8");
let compared = 0;
for (const match of programsSrc.matchAll(/\{ name: "((?:[^"\\]|\\.)*)"[^\n]*?category: "(\w+)" \}/g)) {
  const name = match[1].replace(/\\"/g, '"');
  assert.strictEqual(descriptions[name]?.category, match[2], `category mismatch for ${name}`);
  compared += 1;
}
assert.strictEqual(compared, 147);

console.log(`native-check OK: ${names.length} catalog records, ${compared} categories agree, ${cases.length} match cases, 23 unknown descriptions.`);
