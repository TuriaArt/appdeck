import { Boxes, ChevronDown, Code2, RefreshCw, Search, Sparkles } from "lucide-react";
import type { RefObject } from "react";
import { SORT_OPTIONS, type SortMode } from "../data/catalog";
import { cn } from "../utils/cn";
import { ThemePicker } from "./ThemePicker";
import type { CustomBackground, ThemeId } from "../data/themes";

interface TopBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  sort: SortMode;
  onSortChange: (value: SortMode) => void;
  onRefresh: () => void;
  scanning: boolean;
  total: number;
  onShowGuide: () => void;
  searchRef: RefObject<HTMLInputElement | null>;
  theme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
  accent: string | null;
  onAccentChange: (hex: string | null) => void;
  customBg: CustomBackground | null;
  onCustomBgChange: (bg: CustomBackground | null) => void;
  onBackgroundDimChange: (dim: number) => void;
  onNotify: (message: string) => void;
}

export function TopBar({
  search,
  onSearchChange,
  sort,
  onSortChange,
  onRefresh,
  scanning,
  total,
  onShowGuide,
  searchRef,
  theme,
  onThemeChange,
  accent,
  onAccentChange,
  customBg,
  onCustomBgChange,
  onBackgroundDimChange,
  onNotify,
}: TopBarProps) {
  return (
    <header className="glass-header sticky top-0 z-40">
      <div className="mx-auto flex max-w-[1680px] flex-wrap items-center gap-x-2.5 gap-y-2 px-4 py-3 sm:px-6 xl:px-8">
        <div className="flex items-center gap-3">
          <div className="brand-mark flex h-10 w-10 items-center justify-center rounded-[13px] text-white">
            <Boxes className="relative z-10 h-[21px] w-[21px]" strokeWidth={1.9} />
          </div>
          <div className="min-w-0">
            <div className="display-font flex items-center gap-2 text-[18px] font-bold leading-none text-white">
              AppDeck
              <span className="hidden rounded-full border border-violet-400/20 bg-violet-400/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-violet-300 sm:inline">
                beta
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              <span className="h-1 w-1 rounded-full bg-emerald-400" />
              Windows · program library
            </div>
          </div>
        </div>

        <div className="ml-auto hidden items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 xl:flex">
          <Sparkles className="h-3.5 w-3.5 text-violet-300/80" />
          <span className="text-[11px] font-medium text-slate-400">
            <span className="text-slate-200">{total}</span> приложений в индексе
          </span>
        </div>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2 md:ml-4 md:flex-1 md:flex-nowrap">
          <button
            type="button"
            onClick={onRefresh}
            disabled={scanning}
            className="header-control order-2 flex h-9 items-center gap-2 rounded-[10px] px-3 text-[12px] font-medium text-slate-300 disabled:opacity-70 md:order-none"
            title="Обновить библиотеку"
          >
            <RefreshCw className={cn("h-[15px] w-[15px] text-slate-400", scanning && "spin")} />
            <span className="hidden lg:inline">{scanning ? "Сканирование…" : "Обновить"}</span>
          </button>

          <button
            type="button"
            onClick={onShowGuide}
            className="header-control order-3 flex h-9 items-center gap-2 rounded-[10px] px-3 text-[12px] font-medium text-slate-300 md:order-none"
            title="Перейти на Electron"
          >
            <Code2 className="h-[15px] w-[15px] text-violet-300/80" />
            <span className="hidden xl:inline">Electron</span>
          </button>

          <ThemePicker
            theme={theme}
            onChange={onThemeChange}
            accent={accent}
            onAccentChange={onAccentChange}
            customBg={customBg}
            onCustomBgChange={onCustomBgChange}
            onBackgroundDimChange={onBackgroundDimChange}
            onNotify={onNotify}
          />

          <label className="header-control order-5 flex h-9 shrink-0 items-center gap-1.5 rounded-[10px] pl-2.5 pr-2 text-[12px] text-slate-300">
            <span className="sr-only">Сортировка</span>
            <select
              value={sort}
              onChange={(event) => onSortChange(event.target.value as SortMode)}
              className="max-w-[124px] cursor-pointer appearance-none bg-transparent pr-1 text-[12px] font-medium text-slate-300 outline-none [&>option]:bg-[#141a2b] [&>option]:text-slate-200 md:max-w-none"
              aria-label="Сортировка программ"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none h-3.5 w-3.5 shrink-0 text-slate-500" />
          </label>

          <div className="header-control order-1 flex h-9 w-full min-w-0 items-center gap-2 rounded-[10px] px-3 md:order-none md:w-[224px] xl:w-[286px]">
            <Search className="h-[15px] w-[15px] shrink-0 text-slate-500" />
            <input
              ref={searchRef}
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Найти приложение…"
              className="search-input min-w-0 flex-1 bg-transparent text-[12px] text-slate-200 outline-none"
              type="search"
              autoComplete="off"
              spellCheck={false}
              aria-label="Поиск программ"
            />
            {search ? (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="text-[10px] font-medium text-slate-500 transition hover:text-slate-200"
              >
                Сброс
              </button>
            ) : (
              <kbd className="kbd-hint hidden rounded-[5px] px-1.5 py-0.5 font-mono text-[9px] leading-none md:inline">
                /
              </kbd>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
