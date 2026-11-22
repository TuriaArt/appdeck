import { useState } from "react";
import { Check, Clipboard, Code2, FileJson2, FolderTree, ShieldCheck, TerminalSquare } from "lucide-react";
import { ModalShell } from "./ModalShell";

interface ElectronGuideProps {
  onClose: () => void;
  onNotify: (message: string) => void;
}

const STEPS = [
  {
    title: "Добавьте Electron к существующей сборке",
    text: "Оставьте Vite и React как renderer-слой. Electron будет загружать готовый dist/index.html в BrowserWindow.",
    code: `npm i -D electron electron-builder concurrently wait-on
// package.json → "main": "electron/main.cjs"
// scripts.dev: concurrently "vite" "wait-on tcp:5173 && electron ."`,
  },
  {
    title: "Создайте защищённое нативное окно",
    text: "Загружайте production-сборку через loadFile, держите contextIsolation включённым и не открывайте Node API напрямую в renderer.",
    code: `const win = new BrowserWindow({
  width: 1440, height: 920, minWidth: 1000, minHeight: 700,
  backgroundColor: "#121212",
  titleBarStyle: "hidden",
  webPreferences: {
    preload: path.join(__dirname, "preload.cjs"),
    contextIsolation: true,
    nodeIntegration: false,
  },
});
win.loadFile(path.join(__dirname, "../dist/index.html"));`,
  },
  {
    title: "Свяжите renderer и main через IPC",
    text: "В preload оставьте только явный узкий API. В main зарегистрируйте сканирование, удаление, внешние ссылки и поиск аналогов.",
    code: `// electron/preload.cjs
contextBridge.exposeInMainWorld("appDeck", {
  scan:             () => ipcRenderer.invoke("registry:scan"),
  uninstall:        (id) => ipcRenderer.invoke("app:uninstall", id),
  openExternal:     (url) => ipcRenderer.invoke("app:open-external", url),
  findAlternatives: (name) => ipcRenderer.invoke("app:find-alternatives", name),
});

// renderer: диалог подтверждения → main: registry.uninstall(program)
// MSI: msiexec.exe /x {ProductCode} /passive`,
  },
  {
    title: "Сканируйте реестр через child_process",
    text: "Читайте обе ветки Uninstall — 64-битную и WOW6432Node. Разберите DisplayName, DisplayVersion, Publisher, InstallDate и InstallLocation; отфильтруйте обновления без DisplayName.",
    code: `const { execFile } = require("node:child_process");
const KEYS = [
  "HKLM\\\\SOFTWARE\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Uninstall",
  "HKLM\\\\SOFTWARE\\\\WOW6432Node\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Uninstall",
];

function readRegistry() {
  return Promise.all(KEYS.map((key) => new Promise((resolve) => {
    execFile("reg.exe", ["query", key, "/s"], { windowsHide: true },
      (error, stdout) => resolve(error ? [] : parseRegOutput(stdout)));
  })));
}
// TODO: объединить результаты, убрать дубли и системные обновления`,
  },
  {
    title: "Подключите темы, GitHub и аналоги",
    text: "Пять тем уже переключаются через CSS-переменные и сохраняются в localStorage. GitHub открывается через shell.openExternal. findAlternatives пока читает descriptions.json — замените его на API или локальную базу соответствий.",
    code: `// Темы: localStorage["appdeck.theme"]
// dark | light | amoled | warm | nord

// GitHub: только проверенные https-ссылки
shell.openExternal(repoUrl);

// TODO: findAlternatives(name) → API / local mapping DB
// TODO: descriptions.json → API описаний с кэшем
npx electron-builder --win --x64`,
  },
];

export function ElectronGuide({ onClose, onNotify }: ElectronGuideProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copy = async (value: string, index: number) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedIndex(index);
      onNotify("Фрагмент скопирован");
      window.setTimeout(() => setCopiedIndex(null), 1600);
    } catch {
      onNotify("Не удалось получить доступ к буферу обмена");
    }
  };

  return (
    <ModalShell onClose={onClose} labelledBy="electron-guide-title" className="max-w-[880px]">
      <div className="flex max-h-[88vh] flex-col">
        <div className="relative shrink-0 overflow-hidden border-b border-white/[0.08] px-5 pb-5 pt-6 sm:px-7">
          <div className="pointer-events-none absolute -right-12 -top-24 h-56 w-56 rounded-full bg-violet-500/15 blur-3xl" />
          <div className="relative flex items-start gap-3.5 pr-10">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-400/25 bg-violet-400/10 text-violet-300">
              <Code2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-violet-400/20 bg-violet-400/[0.08] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.13em] text-violet-300">
                  Electron handoff
                </span>
                <span className="text-[9px] font-medium uppercase tracking-[0.13em] text-slate-600">
                  prototype → native
                </span>
              </div>
              <h2 id="electron-guide-title" className="display-font mt-2 text-[24px] font-bold leading-tight text-white">
                Пять шагов до нативного приложения
              </h2>
              <p className="mt-1.5 max-w-[590px] text-[11.5px] leading-[1.65] text-slate-400">
                Прототип уже отделяет данные от интерфейса. Темы, удаление с подтверждением, Open Source и аналоги готовы;
                нативный слой подключает реестр Windows и безопасный запуск uninstaller.
              </p>
            </div>
          </div>
        </div>

        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          <div className="space-y-5">
            {STEPS.map((step, index) => (
              <div key={step.title} className="grid gap-3 sm:grid-cols-[32px_1fr]">
                <div className="step-number flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-bold">
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <h3 className="text-[12.5px] font-semibold text-slate-100">{step.title}</h3>
                  <p className="mt-1 text-[11px] leading-[1.7] text-slate-500">{step.text}</p>
                  <div className="relative mt-2.5">
                    <pre className="code-block thin-scroll overflow-x-auto rounded-lg p-3 pr-10 text-[10px] leading-[1.65]">
                      <code>{step.code}</code>
                    </pre>
                    <button
                      type="button"
                      onClick={() => copy(step.code, index)}
                      className="icon-button absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-[#0b1020]/80"
                      aria-label={`Скопировать шаг ${index + 1}`}
                    >
                      {copiedIndex === index ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Clipboard className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
            <div className="flex items-center gap-2">
              <TerminalSquare className="h-3.5 w-3.5 text-violet-300/80" />
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Карта файлов
              </h3>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {[
                ["src/data/programs.ts", "данные программ (аналог programs.js)"],
                ["src/data/descriptions.json", "описания, Open Source, аналоги"],
                ["src/data/themes.ts", "пять тем и ключ localStorage"],
                ["src/components/*.tsx", "UI и действия (аналог app.js)"],
                ["src/styles/style.css", "CSS-переменные всех тем"],
                ["electron/registry.cjs", "реестр и spawn uninstaller"],
                ["index.html", "точка входа renderer"],
                ["electron/main.cjs", "новый слой: реестр и окно"],
              ].map(([file, purpose]) => (
                <div key={file} className="flex min-w-0 items-start gap-2 rounded-lg bg-black/20 px-2.5 py-2">
                  {file.endsWith(".json") ? (
                    <FileJson2 className="mt-0.5 h-3 w-3 shrink-0 text-amber-300/70" />
                  ) : file.includes("electron") ? (
                    <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-emerald-300/70" />
                  ) : (
                    <FolderTree className="mt-0.5 h-3 w-3 shrink-0 text-slate-500" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[9.5px] text-slate-300">{file}</p>
                    <p className="mt-0.5 text-[9px] text-slate-600">{purpose}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-300/[0.12] bg-amber-300/[0.04] px-3 py-2.5">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300/70" />
            <p className="text-[10px] leading-[1.65] text-slate-500">
              Не включайте <span className="font-mono text-slate-400">nodeIntegration</span> в renderer. Валидируйте пути в main-процессе
              и подписывайте установщик перед распространением.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/[0.08] px-5 py-3 sm:px-7">
          <p className="hidden text-[9.5px] text-slate-600 sm:block">
            Точка старта: <span className="font-mono text-slate-500">src/data/programs.ts</span>
          </p>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto h-8 rounded-lg border border-white/10 bg-white/[0.06] px-4 text-[11px] font-semibold text-slate-200 transition hover:bg-white/[0.1]"
          >
            Вернуться в библиотеку
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
