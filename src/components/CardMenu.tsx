import { useEffect, useRef, type CSSProperties } from "react";
import { ArrowLeftRight, FolderOpen, Info, Search, Trash2 } from "lucide-react";
import { Github } from "./GithubIcon";
import type { Program } from "../data/catalog";
import { getCategory, getRepoUrl } from "../utils/catalog";
import { ProgramIcon } from "./ProgramIcon";

interface CardMenuProps {
  program: Program;
  anchor: DOMRect;
  removed?: boolean;
  onClose: () => void;
  onDetails: () => void;
  onOpenFolder: () => void;
  onSearch: () => void;
  onGitHub: () => void;
  onAlternatives: () => void;
  onUninstall: () => void;
}

export function CardMenu({ program, anchor, removed = false, onClose, onDetails, onOpenFolder, onSearch, onGitHub, onAlternatives, onUninstall }: CardMenuProps) {
  const category = getCategory(program);
  const repoUrl = getRepoUrl(program);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuWidth = Math.min(248, window.innerWidth - 24);
  const menuHeight = repoUrl ? 350 : 314;
  const openUp = window.innerHeight - anchor.bottom < menuHeight + 16;
  const left = Math.max(12, Math.min(anchor.right - menuWidth, window.innerWidth - menuWidth - 12));
  const position: CSSProperties = openUp
    ? { left, bottom: Math.max(12, window.innerHeight - anchor.top + 7) }
    : { left, top: anchor.bottom + 7 };

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const items = () => Array.from(menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)'));
    items()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      const list = items();
      const index = list.indexOf(document.activeElement as HTMLButtonElement);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const next = event.key === "ArrowDown" ? (index + 1) % list.length : (index - 1 + list.length) % list.length;
        list[next]?.focus();
      }
      if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        list[event.key === "Home" ? 0 : list.length - 1]?.focus();
      }
    };
    menu.addEventListener("keydown", onKeyDown);
    return () => menu.removeEventListener("keydown", onKeyDown);
  }, []);

  const itemClass = "menu-item flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12px]";

  return (
    <>
      <button type="button" className="fixed inset-0 z-[59] cursor-default bg-transparent" onClick={onClose} aria-label="Закрыть меню" tabIndex={-1} />
      <div
        ref={menuRef}
        role="menu"
        aria-label={`Действия для ${program.name}`}
        className="menu-surface thin-scroll fixed z-[60] overflow-y-auto rounded-xl p-1.5"
        style={{ ...position, width: menuWidth, maxHeight: window.innerHeight - 24 }}
      >
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <ProgramIcon name={program.name} icon={program.icon} accent={category.accent} className="h-8 w-8 rounded-[9px] text-[13px] font-semibold" />
          <span className="min-w-0">
            <span className="block truncate text-[11.5px] font-semibold text-primary">{program.name}</span>
            <span className="block text-[9.5px] text-faint">{removed ? "Удалено из демо-индекса" : program.version ? `Версия ${program.version}` : "Версия не указана"}</span>
          </span>
        </div>
        <div className="my-1 h-px" style={{ background: "var(--line)" }} />
        <button type="button" role="menuitem" onClick={onDetails} className={itemClass}><Info className="h-3.5 w-3.5 text-faint" />Подробнее</button>
        <button type="button" role="menuitem" onClick={onOpenFolder} className={itemClass}><FolderOpen className="h-3.5 w-3.5 text-faint" />Открыть папку</button>
        <button type="button" role="menuitem" onClick={onSearch} className={itemClass}><Search className="h-3.5 w-3.5 text-faint" />Найти в интернете</button>
        {repoUrl && (
          <button type="button" role="menuitem" onClick={onGitHub} className={itemClass}><Github className="h-3.5 w-3.5 text-success" />GitHub<span className="ml-auto text-[9px] text-success">Open Source</span></button>
        )}
        <button type="button" role="menuitem" onClick={onAlternatives} className={itemClass}><ArrowLeftRight className="h-3.5 w-3.5 text-accent" />Найти аналоги</button>
        <div className="my-1 h-px" style={{ background: "var(--line)" }} />
        <button type="button" role="menuitem" disabled={removed} onClick={onUninstall} className={`${itemClass} danger`}><Trash2 className="h-3.5 w-3.5" />{removed ? "Уже удалено" : "Удалить"}</button>
        <div className="mx-1 mt-1.5 border-t border-subtle px-1.5 pt-2 text-[9px] leading-relaxed text-faint">
          Прототип · удаление только после подтверждения
        </div>
      </div>
    </>
  );
}
