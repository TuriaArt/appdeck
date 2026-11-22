// Opens only the Electron window against an already running Vite dev server.
// VITE_DEV_SERVER_URL is what electron/main.cjs reads; override it if Vite runs elsewhere.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const electronPath = require("electron");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const devUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";
const extraArgs = process.argv.slice(2);

try {
  const response = await fetch(devUrl, { signal: AbortSignal.timeout(1500) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
} catch {
  console.error(
    `[electron:start] Dev-сервер не отвечает на ${devUrl}.\n` +
      "Запустите его в другом терминале командой npm run dev (или npm run electron:dev для обоих сразу)."
  );
  process.exit(1);
}

console.log(`[electron:start] Открываю Electron против ${devUrl}`);
const electron = spawn(electronPath, [path.join(rootDir, "electron/main.cjs"), ...extraArgs], {
  cwd: rootDir,
  stdio: "inherit",
  env: { ...process.env, VITE_DEV_SERVER_URL: devUrl },
});

electron.on("exit", (code) => process.exit(code ?? 0));
electron.on("error", (error) => {
  console.error("[electron:start] Не удалось запустить Electron:", error.message);
  process.exit(1);
});
