// Starts the Vite dev server and opens the Electron window against it.
// No concurrently/wait-on needed: Node's child_process + HTTP polling is ~60 lines
// and avoids two extra dev dependencies. Extra CLI args are forwarded to Electron.
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const electronPath = require("electron");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEV_URL = "http://localhost:5173";
const extraArgs = process.argv.slice(2);

const children = [];
/** Vite is started through the shell on Windows, so its direct child is cmd.exe. */
let viteChild = null;
let shuttingDown = false;

function stopChild(child) {
  if (child.killed || child.exitCode !== null) return;
  if (child === viteChild && process.platform === "win32" && child.pid) {
    // child.kill() would only stop cmd.exe and leave Vite holding port 5173.
    try {
      spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      return;
    } catch {
      // fall through to the regular kill
    }
  }
  child.kill("SIGTERM");
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) stopChild(child);
  process.exit(code);
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => shutdown(0));
}

async function isDevServerUp() {
  try {
    const response = await fetch(DEV_URL, { signal: AbortSignal.timeout(1000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForDevServer(timeoutMs = 60_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isDevServerUp()) return true;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return false;
}

function startElectron() {
  const electron = spawn(electronPath, [path.join(rootDir, "electron/main.cjs"), ...extraArgs], {
    cwd: rootDir,
    stdio: "inherit",
    env: { ...process.env, VITE_DEV_SERVER_URL: DEV_URL },
  });
  children.push(electron);
  electron.on("exit", (code) => shutdown(code ?? 0));
  electron.on("error", (error) => {
    console.error("[electron:dev] Не удалось запустить Electron:", error.message);
    shutdown(1);
  });
}

async function main() {
  if (await isDevServerUp()) {
    console.log(`[electron:dev] Vite уже запущен на ${DEV_URL}, переиспользую его.`);
  } else {
    console.log("[electron:dev] Запускаю Vite на порту 5173…");
    // Node >= 22.12 refuses to spawn .cmd files without a shell (EINVAL),
    // so on Windows npx goes through the shell instead of calling npx.cmd directly.
    const vite = spawn(
      "npx",
      ["vite", "--port", "5173", "--strictPort"],
      { cwd: rootDir, stdio: "inherit", env: process.env, shell: process.platform === "win32" }
    );
    viteChild = vite;
    children.push(vite);
    vite.on("error", (error) => {
      console.error("[electron:dev] Не удалось запустить Vite:", error.message);
      shutdown(1);
    });
    vite.on("exit", (code) => {
      if (!shuttingDown) {
        console.error(`[electron:dev] Vite завершился с кодом ${code}.`);
        shutdown(code ?? 1);
      }
    });
  }

  if (!(await waitForDevServer())) {
    console.error(`[electron:dev] Dev-сервер не ответил на ${DEV_URL} за 60 секунд.`);
    shutdown(1);
    return;
  }

  console.log("[electron:dev] Dev-сервер готов, открываю окно Electron…");
  startElectron();
}

await main();
