import type { CSSProperties } from "react";
import { ArrowLeftRight, ArrowUpRight, Check, Library, SearchX } from "lucide-react";
import type { Program } from "../data/catalog";
import { CATEGORY_MAP } from "../data/catalog";
import { getAlternatives, getCategory } from "../utils/catalog";
import { ProgramIcon } from "./ProgramIcon";
import { ModalShell } from "./ModalShell";

interface AlternativesModalProps {
  program: Program;
  programs: Program[];
  onClose: () => void;
  onOpenProgram: (program: Program) => void;
}

export function AlternativesModal({ program, programs, onClose, onOpenProgram }: AlternativesModalProps) {
  const category = getCategory(program);
  const alternatives = getAlternatives(program, programs);
  const installedCount = alternatives.filter((item) => item.installed).length;

  return (
    <ModalShell onClose={onClose} labelledBy="alternatives-title" accent={category.accent} className="max-w-[760px]">
      <div className="flex max-h-[88vh] flex-col">
        <div className="shrink-0 border-b border-subtle px-5 pb-5 pt-6 sm:px-7">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Поиск аналогов
          </div>
          <h2 id="alternatives-title" className="display-font mt-2 pr-8 text-[25px] font-bold leading-tight text-primary">
            Аналоги для {program.name}
          </h2>
          <p className="mt-2 text-[12px] leading-relaxed text-muted">
            Другие инструменты в категории «{category.label}» — с коротким объяснением, чем они отличаются.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="surface-inset rounded-full px-2.5 py-1 text-[10px] text-secondary">
              {alternatives.length} в подборке
            </span>
            {installedCount > 0 && (
              <span className="installed-note rounded-full px-2.5 py-1 text-[10px] font-medium">
                {installedCount} уже в библиотеке
              </span>
            )}
          </div>
        </div>

        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
          {alternatives.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {alternatives.map((item) => {
                const accent = CATEGORY_MAP[item.category].accent;
                return (
                  <article
                    key={item.name}
                    className={`alternative-card flex flex-col p-4 ${item.installed ? "is-installed" : ""}`}
                    style={{ "--accent": accent } as CSSProperties}
                  >
                    <div className="flex items-start gap-3">
                      <ProgramIcon name={item.name} icon={item.installed?.icon} className="h-10 w-10 rounded-xl text-[17px] font-semibold" />
                      <div className="min-w-0 flex-1 pt-0.5">
                        <h3 className="text-[13px] font-semibold leading-5 text-primary">{item.name}</h3>
                        {item.installed ? (
                          <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-success">
                            <Check className="h-3 w-3" />
                            есть в моей библиотеке
                          </span>
                        ) : (
                          <span className="mt-1 block text-[10px] text-faint">Не установлено</span>
                        )}
                      </div>
                    </div>
                    <p className="mt-3 flex-1 text-[12px] leading-[1.7] text-secondary">{item.description}</p>
                    {item.installed && (
                      <button
                        type="button"
                        onClick={() => onOpenProgram(item.installed!)}
                        className="btn-secondary mt-4 h-8 w-full text-[11px]"
                      >
                        <Library className="h-3 w-3" />
                        Открыть карточку
                        <ArrowUpRight className="ml-auto h-3 w-3" />
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-[220px] flex-col items-center justify-center px-4 text-center">
              <div className="surface-inset flex h-12 w-12 items-center justify-center rounded-2xl text-muted">
                <SearchX className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-[15px] font-semibold text-primary">Пока нет проверенных аналогов</h3>
              <p className="mt-2 max-w-[360px] text-[12px] leading-relaxed text-muted">
                Для этой программы список соответствий пуст. Мы не подставляем случайные приложения только ради заполнения карточек.
              </p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-subtle px-5 py-3.5 sm:px-7">
          <p className="max-w-[440px] text-[10px] leading-relaxed text-faint">
            Подборка из локальной базы соответствий. Наличие проверяется по вашей библиотеке; установка не выполняется.
          </p>
          <button type="button" onClick={onClose} className="btn-secondary h-8 shrink-0 px-4 text-[11px]">
            Готово
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
