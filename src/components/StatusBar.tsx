import { Database, LoaderCircle } from "lucide-react";
import { formatTime } from "../utils/catalog";

interface StatusBarProps {
  shown: number;
  total: number;
  categoryLabel: string;
  lastScan: Date;
  scanning: boolean;
}

export function StatusBar({ shown, total, categoryLabel, lastScan, scanning }: StatusBarProps) {
  return (
    <footer className="status-bar fixed inset-x-0 bottom-0 z-30">
      <div className="mx-auto flex h-9 max-w-[1680px] items-center gap-3 px-4 text-[10px] text-slate-500 sm:px-6 xl:px-8">
        <p className="shrink-0" role="status" aria-live="polite">
          Показано <span className="font-semibold tabular-nums text-slate-300">{shown}</span> из{" "}
          <span className="font-semibold tabular-nums text-slate-300">{total}</span> программ.
        </p>
        <span className="hidden h-2.5 w-px bg-white/10 sm:block" />
        <span className="hidden truncate sm:block">{categoryLabel}</span>
        <div className="ml-auto flex shrink-0 items-center gap-3">
          <span className="hidden items-center gap-1.5 md:flex">
            <Database className="h-2.5 w-2.5 text-slate-600" />
            Локальный индекс
          </span>
          <span className="flex items-center gap-1.5">
            {scanning ? (
              <>
                <LoaderCircle className="h-2.5 w-2.5 spin text-violet-300" />
                <span className="text-violet-300/90">Сканирование реестра…</span>
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_7px_rgba(52,211,153,.55)]" />
                <span>Обновлено в {formatTime(lastScan)}</span>
              </>
            )}
          </span>
        </div>
      </div>
    </footer>
  );
}
