import { useEffect, useMemo, useRef, useState } from "react";
import { Ban, Boxes, Clock3, LayoutGrid, Monitor, RotateCcw, SearchX } from "lucide-react";
import { ActionDialog, type PrototypeAction } from "./components/ActionDialog";
import { AlternativesModal } from "./components/AlternativesModal";
import { CardMenu } from "./components/CardMenu";
import { CategoryFilters } from "./components/CategoryFilters";
import { ElectronGuide } from "./components/ElectronGuide";
import { ProgramCard } from "./components/ProgramCard";
import { ProgramModal } from "./components/ProgramModal";
import { StatusBar } from "./components/StatusBar";
import { Toast } from "./components/Toast";
import { TopBar } from "./components/TopBar";
import { UninstallDialog } from "./components/UninstallDialog";
import { CATEGORIES, CATEGORY_MAP, type CategoryId, type Program, type SortMode } from "./data/catalog";
import { PROGRAMS } from "./data/programs";
import type { CustomBackground } from "./data/themes";
import { useAccent, useCustomBackground, useTheme } from "./hooks/useTheme";
import { categoryCounts, filterAndSortPrograms, formatTime, getRepoUrl, pluralizePrograms } from "./utils/catalog";

interface MenuState { program: Program; anchor: DOMRect }
interface ActionState { type: PrototypeAction; program: Program }
interface ToastAction { label: string; onClick: () => void }
interface ToastState { id: number; message: string; action?: ToastAction }
interface NativeProgram {
  id: string;
  name: string;
  version?: string;
  publisher?: string;
  category?: string;
  installedAt?: string | null;
  installLocation?: string;
  uninstallString?: string;
  registryKey?: string;
  catalogName?: string | null;
  icon?: string | null;
  estimatedSizeMB?: number | null;
  executable?: string;
  description?: string | null;
  screenshot?: string | null;
}

/** Maps the list sent by electron/main.cjs (scan result or registry:updated push) to UI programs. */
function toPrograms(raw: NativeProgram[]): Program[] {
  // Category, catalogName, icon and user overrides are resolved in electron/main.cjs.
  return raw.map((entry) => ({
    id: entry.id,
    name: entry.name,
    version: entry.version ?? "",
    publisher: entry.publisher ?? "",
    category: CATEGORIES.some((item) => item.id === entry.category) ? entry.category as CategoryId : "other",
    catalogName: entry.catalogName ?? null,
    icon: entry.icon ?? null,
    estimatedSizeMB: entry.estimatedSizeMB ?? null,
    executable: entry.executable,
    installedAt: entry.installedAt ?? null,
    installLocation: entry.installLocation,
    uninstallString: entry.uninstallString,
    registryKey: entry.registryKey,
    description: typeof entry.description === "string" ? entry.description : null,
    screenshot: typeof entry.screenshot === "string" ? entry.screenshot : null,
  }));
}

export default function App() {
  const { theme, setTheme } = useTheme();
  const { accent, setAccent } = useAccent();
  const { customBg, setCustomBg, updateDim } = useCustomBackground();
  const [catalog, setCatalog] = useState<Program[]>(PROGRAMS);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryId | "all">("all");
  const [sort, setSort] = useState<SortMode>("category");
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState(() => new Date());
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [action, setAction] = useState<ActionState | null>(null);
  const [alternativesProgram, setAlternativesProgram] = useState<Program | null>(null);
  const [uninstallProgram, setUninstallProgram] = useState<Program | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const refreshTimer = useRef<number | null>(null);
  const toastTimer = useRef<number | null>(null);
  const deletedIdsRef = useRef(deletedIds);
  deletedIdsRef.current = deletedIds;

  const counts = useMemo(() => categoryCounts(catalog), [catalog]);
  const results = useMemo(() => filterAndSortPrograms(catalog, query, activeCategory, sort), [catalog, query, activeCategory, sort]);
  const activePrograms = useMemo(() => catalog.filter((program) => !deletedIds.has(program.id)), [catalog, deletedIds]);
  const activeCategoryMeta = activeCategory === "all" ? null : CATEGORY_MAP[activeCategory];
  const sectionTitle = activeCategoryMeta ? activeCategoryMeta.label : "Вся библиотека";
  const sectionSubtitle = query.trim()
    ? `Результаты поиска: «${query.trim()}»`
    : activeCategoryMeta ? activeCategoryMeta.description : "Полный каталог установленных приложений";
  const hasFilters = Boolean(query.trim()) || activeCategory !== "all";

  const notify = (message: string, toastAction?: ToastAction) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message, action: toastAction });
    toastTimer.current = window.setTimeout(() => setToast(null), toastAction ? 7000 : 3400);
  };

  const closeOverlays = () => {
    setMenu(null);
    setSelectedProgram(null);
    setAction(null);
    setAlternativesProgram(null);
    setUninstallProgram(null);
  };

  const handleRefresh = async () => {
    if (scanning) return;
    setScanning(true);
    closeOverlays();

    if (window.appDeck?.scan) {
      try {
        const next = toPrograms(await window.appDeck.scan() as NativeProgram[]);
        setCatalog(next);
        deletedIdsRef.current = new Set();
        setDeletedIds(new Set());
        setLastScan(new Date());
        notify(`Индекс обновлён · ${next.length} ${pluralizePrograms(next.length)}`);
      } catch {
        notify("Не удалось обновить индекс. Проверьте доступ к реестру Windows.");
      } finally {
        setScanning(false);
      }
      return;
    }

    if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
    refreshTimer.current = window.setTimeout(() => {
      const removed = deletedIdsRef.current;
      const next = PROGRAMS.filter((program) => !removed.has(program.id));
      setCatalog(next);
      deletedIdsRef.current = new Set();
      setDeletedIds(new Set());
      setLastScan(new Date());
      setScanning(false);
      notify(removed.size > 0
        ? `Индекс обновлён · ${next.length} программ · скрыто удалённых: ${removed.size}`
        : `Сканирование завершено · ${next.length} программ в индексе`);
    }, 1150);
  };

  const openDetails = (program: Program) => {
    setMenu(null);
    setAlternativesProgram(null);
    setSelectedProgram(program);
  };

  const launchProgram = async (program: Program) => {
    setMenu(null);
    if (deletedIds.has(program.id)) {
      notify(`${program.name} уже удалена из демо-индекса`);
      return;
    }
    // installLocation бывает пустым (NSIS/Store) — main сам разрулит запуск и вернёт ошибку, если exe не найден.
    if (window.appDeck?.launch) {
      const result = await window.appDeck.launch(program.id);
      notify(result.ok ? `${program.name} запускается…` : result.error ?? "Не удалось запустить приложение");
      return;
    }
    notify(`${program.name} запускается… Действие эмулируется в прототипе`);
  };

  const requestAction = async (type: PrototypeAction, program: Program) => {
    closeOverlays();
    if (type === "search" && window.appDeck?.webSearch) {
      const result = await window.appDeck.webSearch(`${program.name} ${program.publisher} программа Windows`);
      if (!result.ok) notify(result.error ?? "Не удалось открыть поиск");
      return;
    }
    if (type === "folder" && window.appDeck?.reveal) {
      // installLocation бывает пустым (NSIS/Store) — тогда показываем папку, где лежит exe.
      const exe = program.executable ?? "";
      const exeDir = exe.includes("\\") ? exe.slice(0, exe.lastIndexOf("\\")) : "";
      const target = program.installLocation || exeDir;
      if (target) {
        const result = await window.appDeck.reveal(target);
        if (!result.ok) notify(result.error ?? "Не удалось открыть папку");
        return;
      }
    }
    setAction({ type, program });
  };

  const openGitHub = async (program: Program) => {
    const url = getRepoUrl(program);
    if (!url) return;
    closeOverlays();
    if (window.appDeck?.openExternal) {
      const result = await window.appDeck.openExternal(url);
      notify(result.ok ? "Ссылка открыта во внешнем браузере" : result.error ?? "Не удалось открыть ссылку");
      return;
    }
    setAction({ type: "github", program });
  };

  const openAlternatives = (program: Program) => {
    closeOverlays();
    setAlternativesProgram(program);
  };

  const requestUninstall = (program: Program) => {
    closeOverlays();
    setUninstallProgram(program);
  };

  const confirmUninstall = async (program: Program) => {
    if (deletedIdsRef.current.has(program.id)) {
      setUninstallProgram(null);
      return;
    }

    if (window.appDeck?.uninstall) {
      const result = await window.appDeck.uninstall(program.id);
      setUninstallProgram(null);
      if (result.cancelled) return;
      notify(result.ok ? "Uninstaller запущен. Список обновится сам, когда удаление завершится." : result.error ?? "Не удалось запустить uninstaller");
      return;
    }

    // TODO: spawn(UninstallString) через child_process, не через shell.open.
    // В браузере никогда не запускаем системные команды и не трогаем файлы.
    const next = new Set(deletedIdsRef.current);
    next.add(program.id);
    deletedIdsRef.current = next;
    setDeletedIds(next);
    setUninstallProgram(null);
    notify("TODO: в Electron-версии запустит UninstallString", {
      label: "Вернуть",
      onClick: () => {
        const restored = new Set(deletedIdsRef.current);
        restored.delete(program.id);
        deletedIdsRef.current = restored;
        setDeletedIds(restored);
        notify(`${program.name} возвращена в демо-индекс`);
      },
    });
  };

  const resetFilters = () => {
    setQuery("");
    setActiveCategory("all");
  };

  /** Updates one program in the list and in the open details modal without a rescan. */
  const patchProgram = (programId: string, patch: Partial<Program>) => {
    setCatalog((previous) => previous.map((item) => (item.id === programId ? { ...item, ...patch } : item)));
    setSelectedProgram((previous) => (previous && previous.id === programId ? { ...previous, ...patch } : previous));
  };

  const saveDescription = async (program: Program, text: string): Promise<boolean> => {
    if (window.appDeck?.updateDescription) {
      try {
        const result = await window.appDeck.updateDescription(program.id, text);
        if (!result.ok) {
          notify(result.error ?? "Не удалось сохранить описание");
          return false;
        }
        patchProgram(program.id, { description: result.description ?? null });
        notify(result.description ? "Описание сохранено" : "Правка сброшена, показано описание из каталога");
        return true;
      } catch {
        notify("Не удалось сохранить описание");
        return false;
      }
    }

    // Browser prototype: no disk access, so the edit lives until the page reloads.
    const trimmed = text.trim();
    patchProgram(program.id, { description: trimmed || null });
    notify("Описание изменено до перезагрузки страницы. На диск оно сохраняется в Electron-версии.");
    return true;
  };

  const chooseScreenshot = async (program: Program): Promise<void> => {
    if (!window.appDeck?.chooseScreenshot) {
      notify("Скриншоты добавляются в Electron-версии: там файл копируется в папку приложения.");
      return;
    }
    try {
      const result = await window.appDeck.chooseScreenshot(program.id);
      if (result.ok && result.screenshot) {
        patchProgram(program.id, { screenshot: result.screenshot });
        notify("Скриншот сохранён");
      } else if (result.error !== "cancelled") {
        notify(result.error ?? "Не удалось добавить скриншот");
      }
    } catch {
      notify("Не удалось добавить скриншот");
    }
  };

  /** Saves an image pasted with Ctrl+V (data URL from the clipboard) as the program screenshot. */
  const pasteScreenshot = async (program: Program, dataUrl: string): Promise<void> => {
    if (!window.appDeck?.saveScreenshotFromClipboard) {
      notify("Вставка из буфера работает в Electron-версии.");
      return;
    }
    try {
      const result = await window.appDeck.saveScreenshotFromClipboard(program.id, dataUrl);
      if (result.ok && result.screenshot) {
        patchProgram(program.id, { screenshot: result.screenshot });
        notify("Скриншот из буфера сохранён");
      } else {
        notify(result.error ?? "Не удалось сохранить скриншот из буфера");
      }
    } catch {
      notify("Не удалось сохранить скриншот из буфера");
    }
  };

  const removeScreenshot = async (program: Program): Promise<void> => {
    if (!window.appDeck?.removeScreenshot) return;
    try {
      const result = await window.appDeck.removeScreenshot(program.id);
      if (result.ok) {
        patchProgram(program.id, { screenshot: null });
        notify("Скриншот удалён");
      } else {
        notify(result.error ?? "Не удалось удалить скриншот");
      }
    } catch {
      notify("Не удалось удалить скриншот");
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"]')) return;
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT" || target?.isContentEditable;
      if ((event.key === "/" && !isTyping) || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k")) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!menu) return;
    const closeMenu = () => setMenu(null);
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setMenu(null); };
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [menu]);

  useEffect(() => () => {
    if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  // Electron: scan on startup so saved descriptions and screenshots are visible right after
  // a restart. The ref keeps React StrictMode from scanning twice in development.
  const autoScanStarted = useRef(false);
  useEffect(() => {
    if (autoScanStarted.current || !window.appDeck?.scan) return;
    autoScanStarted.current = true;
    void handleRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Electron: main pushes a fresh list when an uninstalled program leaves the registry.
  useEffect(() => {
    const unsubscribe = window.appDeck?.onRegistryUpdated?.((raw) => {
      const next = toPrograms(raw as NativeProgram[]);
      setCatalog(next);
      deletedIdsRef.current = new Set();
      setDeletedIds(new Set());
      setLastScan(new Date());
      setSelectedProgram((previous) => (previous ? next.find((item) => item.id === previous.id) ?? null : previous));
      notify(`Удаление завершено · список обновлён автоматически · ${next.length} ${pluralizePrograms(next.length)}`);
    });
    return () => unsubscribe?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCustomBgChange = (next: CustomBackground | null) => {
    const { persisted } = setCustomBg(next);
    if (next && !persisted) {
      notify("Фон применён для текущей сессии (изображение слишком большое для сохранения)");
    }
  };

  return (
    <div className="app-shell">
      {customBg && (
        <>
          <div className="custom-bg-layer" aria-hidden="true" />
          <div className="custom-bg-scrim" aria-hidden="true" />
        </>
      )}
      <TopBar
        search={query}
        onSearchChange={setQuery}
        sort={sort}
        onSortChange={setSort}
        onRefresh={() => void handleRefresh()}
        scanning={scanning}
        total={catalog.length}
        onShowGuide={() => { setMenu(null); setGuideOpen(true); }}
        searchRef={searchRef}
        theme={theme}
        onThemeChange={setTheme}
        accent={accent}
        onAccentChange={setAccent}
        customBg={customBg}
        onCustomBgChange={handleCustomBgChange}
        onBackgroundDimChange={updateDim}
        onNotify={(message) => notify(message)}
      />

      <main className="app-content mx-auto max-w-[1680px] px-4 pb-24 sm:px-6 xl:px-8">
        <section className="relative pb-2 pt-8 sm:pt-10 lg:pt-12">
          <div className="hero-orb" />
          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-[700px]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.035] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.13em] text-slate-400">
                  <Monitor className="h-3 w-3 text-violet-300/80" />
                  Windows 11 · локальный каталог
                </span>
                <span className="inline-flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-[0.12em] text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_7px_rgba(52,211,153,.55)]" />
                  индекс актуален
                </span>
              </div>
              <h1 className="display-font mt-4 text-[34px] font-extrabold leading-[1.04] text-white sm:text-[42px] lg:text-[46px]">
                Установленные <span className="hero-title-gradient">программы</span>
              </h1>
              <p className="mt-3 max-w-[610px] text-[12.5px] leading-[1.75] text-slate-400 sm:text-[13px]">
                {catalog.length} приложений с вашего ПК — в одной аккуратной библиотеке. Ищите по названию
                и издателю, фильтруйте по категориям и открывайте нужное в один клик.
              </p>
            </div>
            <div className="grid w-full grid-cols-3 gap-2 sm:max-w-[390px] lg:w-[390px]">
              {[
                { icon: Boxes, value: String(catalog.length), label: "программ" },
                { icon: LayoutGrid, value: String(CATEGORIES.length), label: "категорий" },
                { icon: Clock3, value: formatTime(lastScan), label: "обновлено" },
              ].map((stat) => (
                <div key={stat.label} className="soft-panel min-w-0 rounded-[13px] px-3 py-3 sm:px-3.5">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <stat.icon className="h-3 w-3 shrink-0" />
                    <span className="text-[8px] font-semibold uppercase tracking-[0.13em] sm:text-[8.5px]">{stat.label}</span>
                  </div>
                  <p className="display-font mt-1.5 truncate text-[19px] font-bold leading-none text-slate-100">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6" aria-label="Фильтры по категориям">
          <div className="mb-2.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500"><LayoutGrid className="h-3 w-3" />Категории</div>
            <p className="hidden text-[9.5px] text-slate-600 md:block">Каждый цвет — отдельная группа приложений</p>
          </div>
          <CategoryFilters active={activeCategory} counts={counts} onChange={setActiveCategory} />
        </section>

        <section id="catalog" className="mt-7" aria-labelledby="catalog-heading">
          <div className="mb-3.5 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 id="catalog-heading" className="truncate text-[13px] font-semibold tracking-[-0.01em] text-slate-200">{sectionTitle}</h2>
              <p className="mt-0.5 truncate text-[10px] text-slate-600">{sectionSubtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              {hasFilters && (
                <button type="button" onClick={resetFilters} className="header-control flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[10px] font-medium text-slate-400"><RotateCcw className="h-2.5 w-2.5" />Сбросить</button>
              )}
              <span className="inline-flex h-7 items-center rounded-md border border-white/[0.07] bg-white/[0.025] px-2.5 text-[10px] tabular-nums text-slate-500">{results.length} {pluralizePrograms(results.length)}</span>
            </div>
          </div>

          {deletedIds.size > 0 && (
            <div className="surface-inset mb-3 flex flex-wrap items-center gap-2 rounded-xl px-3.5 py-2.5">
              <Ban className="h-3.5 w-3.5 text-muted" />
              <p className="min-w-0 flex-1 text-[11px] text-muted">
                Помечено как удалённые: <span className="font-semibold text-secondary">{deletedIds.size}</span>. Обновите индекс, чтобы скрыть их из списка.
              </p>
              <button type="button" onClick={() => void handleRefresh()} disabled={scanning} className="btn-secondary h-7 px-3 text-[10px]">
                <RotateCcw className={`h-3 w-3 ${scanning ? "spin" : ""}`} />
                Обновить индекс
              </button>
            </div>
          )}

          {results.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {results.map((program, index) => (
                <ProgramCard
                  key={program.id}
                  program={program}
                  index={index}
                  removed={deletedIds.has(program.id)}
                  onDetails={openDetails}
                  onLaunch={(item) => void launchProgram(item)}
                  onSearch={(item) => void requestAction("search", item)}
                  onMenu={(item, anchor) => setMenu({ program: item, anchor })}
                />
              ))}
            </div>
          ) : (
            <div className="flex min-h-[340px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.09] bg-white/[0.012] px-6 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.035] text-slate-500"><SearchX className="h-5 w-5" /></div>
              <h3 className="display-font mt-4 text-lg font-bold text-slate-200">Ничего не найдено</h3>
              <p className="mt-1.5 max-w-[330px] text-[11.5px] leading-5 text-slate-500">Попробуйте изменить запрос или выбрать другую категорию — в библиотеке точно есть что-то интересное.</p>
              <button type="button" onClick={resetFilters} className="mt-6 flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.06] px-3.5 text-[11px] font-medium text-slate-200 transition hover:bg-white/[0.1]"><RotateCcw className="h-3 w-3" />Показать все программы</button>
            </div>
          )}
        </section>
      </main>

      <StatusBar shown={results.length} total={catalog.length} categoryLabel={activeCategoryMeta ? `Категория: ${activeCategoryMeta.label}` : "Все категории"} lastScan={lastScan} scanning={scanning} />

      {menu && (
        <CardMenu
          program={menu.program}
          anchor={menu.anchor}
          removed={deletedIds.has(menu.program.id)}
          onClose={() => setMenu(null)}
          onDetails={() => openDetails(menu.program)}
          onOpenFolder={() => void requestAction("folder", menu.program)}
          onSearch={() => void requestAction("search", menu.program)}
          onGitHub={() => void openGitHub(menu.program)}
          onAlternatives={() => openAlternatives(menu.program)}
          onUninstall={() => requestUninstall(menu.program)}
        />
      )}

      {selectedProgram && (
        <ProgramModal
          key={selectedProgram.id}
          program={selectedProgram}
          removed={deletedIds.has(selectedProgram.id)}
          onClose={() => setSelectedProgram(null)}
          onLaunch={(program) => void launchProgram(program)}
          onSearch={(program) => void requestAction("search", program)}
          onOpenFolder={(program) => void requestAction("folder", program)}
          onGitHub={(program) => void openGitHub(program)}
          onAlternatives={openAlternatives}
          onUninstall={requestUninstall}
          onSaveDescription={saveDescription}
          onChooseScreenshot={chooseScreenshot}
          onPasteScreenshot={pasteScreenshot}
          onRemoveScreenshot={removeScreenshot}
        />
      )}

      {alternativesProgram && (
        <AlternativesModal program={alternativesProgram} programs={activePrograms} onClose={() => setAlternativesProgram(null)} onOpenProgram={openDetails} />
      )}

      {uninstallProgram && (
        <UninstallDialog program={uninstallProgram} onClose={() => setUninstallProgram(null)} onConfirm={(program) => void confirmUninstall(program)} />
      )}

      {action && <ActionDialog action={action.type} program={action.program} onClose={() => setAction(null)} onNotify={notify} />}
      {guideOpen && <ElectronGuide onClose={() => setGuideOpen(false)} onNotify={notify} />}
      {toast && <Toast key={toast.id} message={toast.message} action={toast.action} onClose={() => { if (toastTimer.current) window.clearTimeout(toastTimer.current); setToast(null); }} />}
    </div>
  );
}
