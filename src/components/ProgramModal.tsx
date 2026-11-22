import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowLeftRight, Ban, CalendarDays, ClipboardPaste, ExternalLink, FolderTree, ImagePlus, ImageUp, Pencil, Play, Search, ShieldCheck, Trash2 } from "lucide-react";
import { Github } from "./GithubIcon";
import type { Program } from "../data/catalog";
import { formatInstallDate, formatSize, getCategory, getDescription, getRepoUrl, hasUserDescription } from "../utils/catalog";
import { ProgramIcon } from "./ProgramIcon";
import { ModalShell } from "./ModalShell";

const MAX_DESCRIPTION_LENGTH = 4000;

interface ProgramModalProps {
  program: Program;
  removed?: boolean;
  onClose: () => void;
  onLaunch: (program: Program) => void;
  onSearch: (program: Program) => void;
  onOpenFolder: (program: Program) => void;
  onGitHub: (program: Program) => void;
  onAlternatives: (program: Program) => void;
  onUninstall: (program: Program) => void;
  /** Resolves to true when the text was accepted; the editor then closes. */
  onSaveDescription: (program: Program, text: string) => Promise<boolean>;
  onChooseScreenshot: (program: Program) => Promise<void>;
  /** Saves an image pasted from the clipboard (data URL) as the program screenshot. */
  onPasteScreenshot: (program: Program, dataUrl: string) => Promise<void>;
  onRemoveScreenshot: (program: Program) => Promise<void>;
}

export function ProgramModal({
  program,
  removed = false,
  onClose,
  onLaunch,
  onSearch,
  onOpenFolder,
  onGitHub,
  onAlternatives,
  onUninstall,
  onSaveDescription,
  onChooseScreenshot,
  onPasteScreenshot,
  onRemoveScreenshot,
}: ProgramModalProps) {
  const category = getCategory(program);
  const description = getDescription(program);
  const repoUrl = getRepoUrl(program);
  const isUserDescription = hasUserDescription(program);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [failedScreenshot, setFailedScreenshot] = useState<string | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);

  // A broken or deleted image file falls back to the placeholder instead of a broken icon.
  const screenshot = program.screenshot && program.screenshot !== failedScreenshot ? program.screenshot : null;

  useEffect(() => {
    if (!editing) return;
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    editor.setSelectionRange(editor.value.length, editor.value.length);
  }, [editing]);

  // Ctrl+V while the modal is open: the first image in the clipboard becomes the screenshot.
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (coverBusy) return;
      const items = event.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (!item.type.startsWith("image/")) continue;
        const file = item.getAsFile();
        if (!file) continue;
        event.preventDefault();
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") void onPasteScreenshot(program, reader.result);
        };
        reader.readAsDataURL(file);
        return;
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [program, coverBusy, onPasteScreenshot]);

  const startEditing = () => {
    setDraft(description ?? "");
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setDraft("");
    requestAnimationFrame(() => editButtonRef.current?.focus());
  };

  const submitDescription = async (event?: FormEvent) => {
    event?.preventDefault();
    if (saving) return;
    setSaving(true);
    const saved = await onSaveDescription(program, draft);
    setSaving(false);
    if (saved) {
      setEditing(false);
      setDraft("");
      requestAnimationFrame(() => editButtonRef.current?.focus());
    }
  };

  const handleEditorKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelEditing();
    }
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void submitDescription();
    }
  };

  const runCoverAction = async (action: (target: Program) => Promise<void>) => {
    if (coverBusy) return;
    setCoverBusy(true);
    try {
      await action(program);
    } finally {
      setCoverBusy(false);
    }
  };

  return (
    <ModalShell onClose={onClose} labelledBy="program-modal-title" accent={category.accent} className="max-w-[900px]">
      <div className="grid md:grid-cols-[1.04fr_0.96fr]">
        <div className="preview-stage cover-stage flex min-h-[280px] flex-col justify-between p-5 sm:p-7 md:min-h-[560px]">
          {screenshot ? (
            <>
              <img
                src={screenshot}
                alt={`Скриншот программы ${program.name}`}
                className="cover-image"
                style={{ objectFit: "contain" }}
                draggable={false}
                onError={() => setFailedScreenshot(screenshot)}
              />
              <div className="cover-shade" aria-hidden="true" />
              <div className="relative z-10 flex items-center justify-between">
                <span className="cover-chip">Скриншот</span>
              </div>
              <div className="cover-actions relative z-10 flex flex-wrap gap-2">
                <button type="button" disabled={coverBusy} onClick={() => void runCoverAction(onChooseScreenshot)} className="cover-action">
                  <ImageUp className="h-3.5 w-3.5" />
                  Заменить
                </button>
                <button type="button" disabled={coverBusy} onClick={() => void runCoverAction(onRemoveScreenshot)} className="cover-action is-danger">
                  <Trash2 className="h-3.5 w-3.5" />
                  Удалить
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="relative z-10 flex items-center justify-between">
                <span className="surface-inset rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted">Preview</span>
                <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-faint">Windows app</span>
              </div>
              <div className="relative z-10 px-1 py-8 sm:px-3">
                <div className="mock-window mx-auto max-w-[310px] overflow-hidden rounded-[15px]">
                  <div className="flex h-8 items-center gap-1.5 border-b border-subtle px-3" style={{ background: "var(--wash)" }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--danger)" }} />
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--warning)" }} />
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--success)" }} />
                    <span className="ml-2 h-3 flex-1 rounded" style={{ background: "var(--wash)" }} />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      <ProgramIcon name={program.name} icon={program.icon} className="h-10 w-10 rounded-[11px] text-[17px] font-semibold" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-semibold text-secondary">{program.name}</p>
                        <p className="mt-0.5 text-[8.5px] text-faint">{removed ? "Удалено из демо-индекса" : "Приложение готово к работе"}</p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="h-1.5 w-[72%] rounded-full" style={{ background: "var(--line-strong)" }} />
                      <div className="h-1.5 w-[94%] rounded-full" style={{ background: "var(--line)" }} />
                      <div className="h-1.5 w-[58%] rounded-full" style={{ background: "var(--line)" }} />
                    </div>
                    <div className="mt-4 flex gap-2">
                      <div className="h-6 flex-1 rounded-md border border-subtle" style={{ background: "var(--wash)" }} />
                      <div className="h-6 w-14 rounded-md" style={{ backgroundColor: `color-mix(in srgb, ${category.accent} 22%, transparent)` }} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-medium text-faint">Место под скриншот приложения</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button type="button" disabled={coverBusy} onClick={() => void runCoverAction(onChooseScreenshot)} className="btn-secondary h-8 px-3">
                    <ImagePlus className="h-3.5 w-3.5 text-accent" />
                    Добавить скриншот
                  </button>
                  <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-dashed border-white/10 px-2.5 text-[10px] text-faint">
                    <ClipboardPaste className="h-3 w-3" />
                    или Ctrl+V
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex min-w-0 flex-col p-5 pb-6 sm:p-7">
          <div className="flex flex-wrap items-center gap-2 pr-7">
            <span className="category-label inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold" style={{ borderColor: `color-mix(in srgb, ${category.accent} 30%, transparent)`, backgroundColor: `color-mix(in srgb, ${category.accent} 9%, transparent)` }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: category.accent }} />
              {category.label}
            </span>
            {removed ? (
              <span className="removed-badge"><Ban className="h-2.5 w-2.5" />Удалено</span>
            ) : (
              <span className="installed-note inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9.5px] font-semibold"><span className="h-1 w-1 rounded-full" style={{ background: "var(--success)" }} />Установлена</span>
            )}
            {repoUrl && <span className="open-source-badge"><Github className="h-2.5 w-2.5" />Open Source</span>}
          </div>

          <h2 id="program-modal-title" className="display-font mt-4 pr-5 text-[24px] font-bold leading-[1.16] text-primary">{program.name}</h2>
          <p className="mt-1.5 text-[11px] text-faint">{program.publisher || "Издатель не указан"}</p>

          <div className="mt-5">
            <div className="flex min-h-6 items-center gap-1.5">
              <h3 className="text-[9.5px] font-semibold uppercase tracking-[0.17em] text-faint">Описание</h3>
              {!editing && (
                <button
                  ref={editButtonRef}
                  type="button"
                  onClick={startEditing}
                  className="icon-button flex h-6 w-6 items-center justify-center rounded-md"
                  aria-label="Редактировать описание"
                  title="Редактировать описание"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
              {isUserDescription && !editing && (
                <span className="notice-accent rounded-full px-1.5 py-0.5 text-[8.5px] font-semibold">Ваша правка</span>
              )}
            </div>

            {editing ? (
              <form onSubmit={(event) => void submitDescription(event)} className="mt-2">
                <textarea
                  ref={editorRef}
                  data-modal-escape="ignore"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleEditorKeyDown}
                  maxLength={MAX_DESCRIPTION_LENGTH}
                  rows={6}
                  disabled={saving}
                  placeholder="Напишите, что это за программа и зачем она вам"
                  aria-label="Описание программы"
                  className="description-editor thin-scroll block w-full resize-y rounded-xl p-3 text-[12.5px] leading-[1.65] outline-none"
                />
                <div className="mt-1.5 flex items-center justify-between gap-3 text-[9.5px] text-faint">
                  <span>Пустое поле сбросит вашу правку</span>
                  <span className="shrink-0 tabular-nums">{draft.length} / {MAX_DESCRIPTION_LENGTH}</span>
                </div>
                <div className="mt-2.5 flex justify-end gap-2">
                  <button type="button" onClick={cancelEditing} disabled={saving} className="btn-secondary h-8 px-3.5">Отмена</button>
                  <button type="submit" disabled={saving} className="btn-primary h-8 px-3.5 disabled:opacity-60">{saving ? "Сохранение…" : "Сохранить"}</button>
                </div>
              </form>
            ) : description ? (
              <p className="thin-scroll mt-2 max-h-[220px] overflow-y-auto whitespace-pre-line break-words text-[12.5px] leading-[1.7] text-secondary">{description}</p>
            ) : (
              <div className="surface-inset mt-2 rounded-xl p-3.5">
                <p className="text-[12.5px] font-medium italic text-muted">Описание не найдено</p>
                <p className="mt-1.5 text-[10.5px] leading-[1.6] text-faint">Для этого приложения нет проверенного описания в локальном каталоге. Его можно написать самому — нажмите на карандаш.</p>
                <button type="button" onClick={() => onSearch(program)} className="btn-secondary mt-2.5 h-8 px-2.5 text-[10.5px]"><Search className="h-3 w-3" />Найти в интернете</button>
              </div>
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-4 border-t border-subtle pt-4">
            <div><p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-faint">Версия</p><p className="mt-1 font-mono text-[11.5px] text-secondary">{program.version || "не указана"}</p></div>
            <div><p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-faint">Издатель</p><p className="mt-1 line-clamp-2 text-[11.5px] leading-4 text-secondary">{program.publisher || "не указан"}</p></div>
            <div><p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-faint">Дата установки</p><p className="mt-1 flex items-center gap-1.5 text-[11.5px] text-secondary"><CalendarDays className="h-3 w-3 text-faint" />{formatInstallDate(program.installedAt)}</p></div>
            <div><p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-faint">Источник</p><p className="mt-1 flex items-center gap-1.5 text-[11.5px] text-secondary"><ShieldCheck className="h-3 w-3 text-faint" />Локальный индекс</p></div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-faint">Размер</p>
              <p className="mt-1 text-[11.5px] text-secondary">{program.estimatedSizeMB ? formatSize(program.estimatedSizeMB) : "нет данных"}</p>
            </div>
          </div>
          <p className="mt-3 text-[9px] leading-relaxed text-faint">Дата, источник и размер — демо-данные прототипа (размер не указан). В Electron берутся из реестра Windows: InstallDate и EstimatedSize.</p>

          <div className="mt-auto space-y-2 pt-5">
            <div className="flex gap-2">
              <button type="button" disabled={removed} onClick={() => onLaunch(program)} className="btn-primary h-9 flex-1 disabled:opacity-40"><Play className="h-3 w-3 fill-current" />{removed ? "Удалено" : "Открыть"}</button>
              <button type="button" onClick={() => onOpenFolder(program)} className="btn-secondary h-9 px-3 text-[11px]" title="Открыть папку"><FolderTree className="h-3.5 w-3.5" />Папка</button>
              <button type="button" onClick={() => onSearch(program)} className="btn-secondary h-9 w-9" title="Найти в интернете" aria-label="Найти в интернете"><ExternalLink className="h-3.5 w-3.5" /></button>
            </div>
            {repoUrl && (
              <button type="button" onClick={() => onGitHub(program)} className="btn-github h-9 w-full"><Github className="h-3.5 w-3.5" />Открыть на GitHub<ExternalLink className="ml-auto h-3 w-3" /></button>
            )}
            <button type="button" onClick={() => onAlternatives(program)} className="btn-secondary h-9 w-full"><ArrowLeftRight className="h-3.5 w-3.5 text-accent" />Найти аналоги</button>
            <button type="button" disabled={removed} onClick={() => onUninstall(program)} className="flex h-7 w-full items-center justify-center gap-1.5 rounded-md text-[10.5px] font-medium text-danger transition hover:bg-white/5 disabled:opacity-40"><Trash2 className="h-3 w-3" />{removed ? "Программа удалена из демо-индекса" : "Удалить программу"}</button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
