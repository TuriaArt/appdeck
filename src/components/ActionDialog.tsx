import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Clipboard, Construction, ExternalLink, FolderTree, Search } from "lucide-react";
import { Github } from "./GithubIcon";
import type { Program } from "../data/catalog";
import { getCategory, getRepoUrl } from "../utils/catalog";
import { ProgramIcon } from "./ProgramIcon";
import { ModalShell } from "./ModalShell";

export type PrototypeAction = "search" | "folder" | "github";

interface ActionDialogProps {
  action: PrototypeAction;
  program: Program;
  onClose: () => void;
  onNotify: (message: string) => void;
}

export function ActionDialog({ action, program, onClose, onNotify }: ActionDialogProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);
  const category = getCategory(program);
  const repoUrl = getRepoUrl(program);
  const query = useMemo(() => `${program.name} ${program.publisher || ""} программа Windows`.replace(/\s+/g, " ").trim(), [program]);
  const copyValue = action === "search" ? query : action === "github" ? repoUrl ?? "" : "InstallLocation ← HKLM\\...\\Uninstall";
  const title = action === "search" ? "Поиск в интернете" : action === "github" ? "Репозиторий проекта" : "Открыть папку";

  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current); }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyValue);
      setCopied(true);
      onNotify(action === "github" ? "Ссылка на репозиторий скопирована" : action === "search" ? "Поисковый запрос скопирован" : "Заметка скопирована");
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      onNotify("Браузер не разрешил доступ к буферу обмена");
    }
  };

  return (
    <ModalShell onClose={onClose} labelledBy="action-dialog-title" accent={category.accent} className="max-w-[480px]">
      <div className="p-5 sm:p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border" style={{ color: category.accent, borderColor: `color-mix(in srgb, ${category.accent} 30%, transparent)`, backgroundColor: `color-mix(in srgb, ${category.accent} 10%, transparent)` }}>
          {action === "search" ? <Search className="h-[18px] w-[18px]" /> : action === "github" ? <Github className="h-[18px] w-[18px]" /> : <FolderTree className="h-[18px] w-[18px]" />}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 pr-6">
          <h2 id="action-dialog-title" className="display-font text-xl font-bold text-primary">{title}</h2>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${action === "github" ? "installed-note" : "notice-warning"}`}>
            {action === "github" ? <Github className="h-2.5 w-2.5" /> : <Construction className="h-2.5 w-2.5" />}
            {action === "github" ? "Open Source" : "заглушка"}
          </span>
        </div>
        <div className="surface-inset mt-4 flex items-center gap-2.5 rounded-xl p-2.5">
          <ProgramIcon name={program.name} icon={program.icon} accent={category.accent} className="h-8 w-8 rounded-[9px] text-[13px] font-semibold" />
          <div className="min-w-0">
            <p className="truncate text-[11.5px] font-semibold text-secondary">{program.name}</p>
            <p className="truncate text-[9.5px] text-faint">{program.publisher || "Издатель не указан"}</p>
          </div>
        </div>
        <p className="mt-4 text-[12px] leading-[1.75] text-muted">
          {action === "search"
            ? "В браузерном прототипе внешние ссылки отключены. Запрос уже сформирован — скопируйте его и откройте поиск вручную."
            : action === "github"
              ? "Публичный репозиторий или официальный сайт проекта. В Electron ссылка откроется во внешнем браузере."
              : "Путь установки появится после сканирования реестра Windows. В нативной версии папка будет открываться напрямую в Проводнике."}
        </p>
        <div className="source-link mt-3 flex items-center gap-2 rounded-lg px-3 py-2.5">
          {action === "github" && repoUrl ? (
            <a href={repoUrl} target="_blank" rel="noopener noreferrer" className="thin-scroll min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[10px] text-accent underline underline-offset-2">{repoUrl}</a>
          ) : (
            <code className="thin-scroll min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[10px] text-muted">{copyValue}</code>
          )}
          <button type="button" onClick={handleCopy} className="icon-button flex h-7 w-7 shrink-0 items-center justify-center rounded-md" aria-label="Скопировать">
            {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Clipboard className="h-3.5 w-3.5" />}
          </button>
        </div>
        <div className="notice-accent mt-4 rounded-lg px-3 py-2.5">
          <p className="break-words font-mono text-[9px] leading-relaxed">
            {action === "search"
              ? '// TODO(electron): shell.openExternal(`https://www.google.com/search?q=${encodeURIComponent(query)}`)'
              : action === "github"
                ? '// Electron: shell.openExternal(repoUrl)'
                : '// TODO(electron): shell.showItemInFolder(program.installLocation) или shell.openPath(...)'}
          </p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={handleCopy} className="btn-secondary h-9 px-3 text-[11px]">
            {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Clipboard className="h-3.5 w-3.5" />}
            {copied ? "Скопировано" : "Скопировать"}
          </button>
          {action === "github" && repoUrl && (
            <a href={repoUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary h-9 px-3 text-[11px]"><ExternalLink className="h-3 w-3" />Перейти</a>
          )}
          <button type="button" onClick={onClose} className="btn-primary h-9 px-4 text-[11.5px]">Понятно</button>
        </div>
      </div>
    </ModalShell>
  );
}
