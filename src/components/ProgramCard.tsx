import type { CSSProperties, MouseEvent } from "react";
import { Ban, Ellipsis, Play, Search } from "lucide-react";
import { Github } from "./GithubIcon";
import type { Program } from "../data/catalog";
import { getCategory, getDescription, getRepoUrl } from "../utils/catalog";
import { ProgramIcon } from "./ProgramIcon";

interface ProgramCardProps {
  program: Program;
  index: number;
  removed?: boolean;
  onDetails: (program: Program) => void;
  onLaunch: (program: Program) => void;
  onMenu: (program: Program, anchor: DOMRect) => void;
  onSearch: (program: Program) => void;
}

export function ProgramCard({ program, index, removed = false, onDetails, onLaunch, onMenu, onSearch }: ProgramCardProps) {
  const category = getCategory(program);
  const description = getDescription(program);
  const isOpenSource = Boolean(getRepoUrl(program));
  const cardStyle = {
    "--accent": category.accent,
    animationDelay: `${Math.min(index, 14) * 18}ms`,
  } as CSSProperties;

  const handleMenu = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onMenu(program, event.currentTarget.getBoundingClientRect());
  };

  return (
    <article
      className={`program-card fade-up flex h-full min-h-[218px] flex-col rounded-[16px] p-4 ${removed ? "is-removed" : ""}`}
      style={cardStyle}
      data-removed={removed}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onDetails(program)}
          className="flex min-w-0 flex-1 items-start gap-3 rounded-lg text-left"
          aria-label={`Подробнее о ${program.name}`}
        >
          <ProgramIcon name={program.name} icon={program.icon} className="h-11 w-11 rounded-[12px] text-[19px] font-semibold" />
          <span className="min-w-0 flex-1 pt-0.5">
            <span className="block truncate text-[13.5px] font-semibold leading-5 tracking-[-0.01em] text-primary" title={program.name}>
              {program.name}
            </span>
            <span className="mt-1 flex min-w-0 items-center gap-1.5 text-[10.5px]">
              <span className="category-label flex shrink-0 items-center gap-1.5 font-medium">
                <span className="h-[5px] w-[5px] rounded-full" style={{ backgroundColor: category.accent }} />
                {category.label}
              </span>
              <span className="h-2.5 w-px shrink-0" style={{ background: "var(--line-strong)" }} />
              <span className="truncate font-mono text-[10px] text-faint">
                {program.version ? `v${program.version}` : "версия н/д"}
              </span>
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={handleMenu}
          className="icon-button -mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
          aria-label={`Действия для ${program.name}`}
          aria-haspopup="menu"
        >
          <Ellipsis className="h-[17px] w-[17px]" />
        </button>
      </div>

      <div className="mt-3 min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-[10.5px] text-faint" title={program.publisher || "Издатель не указан"}>
            {program.publisher || "Издатель не указан"}
          </p>
          {removed ? (
            <span className="removed-badge shrink-0"><Ban className="h-2.5 w-2.5" />Удалено</span>
          ) : isOpenSource ? (
            <span className="open-source-badge shrink-0"><Github className="h-2.5 w-2.5" />Open Source</span>
          ) : null}
        </div>
        <div className="mt-2 min-h-[38px]">
          {description ? (
            <p className="line-clamp-2 text-[12px] leading-[19px] text-muted" title={description}>{description}</p>
          ) : (
            <div>
              <p className="text-[12px] italic leading-[19px] text-faint">Описание не найдено</p>
              <button type="button" onClick={() => onSearch(program)} className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-secondary underline decoration-slate-600 underline-offset-2 transition hover:text-primary">
                <Search className="h-3 w-3" />
                Найти в интернете
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-auto flex items-center gap-2 pt-3">
        <button
          type="button"
          disabled={removed}
          onClick={() => onLaunch(program)}
          className="launch-button flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-[11.5px] font-semibold"
        >
          {removed ? <Ban className="h-3 w-3" /> : <Play className="h-3 w-3 fill-current" strokeWidth={1.5} />}
          {removed ? "Удалено" : "Открыть"}
        </button>
        <button
          type="button"
          onClick={handleMenu}
          className="icon-button flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ border: "1px solid var(--line)", background: "var(--wash)" }}
          aria-label={`Ещё действия для ${program.name}`}
          aria-haspopup="menu"
        >
          <Ellipsis className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}
