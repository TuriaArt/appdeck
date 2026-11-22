import type { CSSProperties } from "react";
import { cn } from "../utils/cn";
import { initialOf } from "../utils/catalog";

interface ProgramIconProps {
  name: string;
  /** data: URL from Electron icon extraction. Empty in the browser prototype. */
  icon?: string | null;
  className?: string;
  accent?: string;
}

/** Real app icon when available, otherwise the first letter of the name. */
export function ProgramIcon({ name, icon, className, accent }: ProgramIconProps) {
  return (
    <span
      className={cn("program-icon overflow-hidden", className)}
      style={accent ? ({ "--accent": accent } as CSSProperties) : undefined}
    >
      {icon ? (
        <img src={icon} alt="" draggable={false} className="h-[70%] w-[70%] object-contain" />
      ) : (
        initialOf(name)
      )}
    </span>
  );
}
