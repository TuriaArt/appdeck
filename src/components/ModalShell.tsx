import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../utils/cn";

interface ModalShellProps {
  children: ReactNode;
  onClose: () => void;
  labelledBy: string;
  className?: string;
  accent?: string;
  showClose?: boolean;
}

export function ModalShell({ children, onClose, labelledBy, className, accent = "var(--accent)", showClose = true }: ModalShellProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const dialog = dialogRef.current;
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex="0"]') ?? []);
    const frame = requestAnimationFrame(() => {
      const preferred = dialog?.querySelector<HTMLElement>("[data-autofocus]");
      (preferred ?? focusable()[0])?.focus();
    });
    const handleKey = (event: KeyboardEvent) => {
      // Inline editors opt out so Escape cancels the edit instead of closing the whole modal.
      const inEditor = (event.target as HTMLElement | null)?.closest?.('[data-modal-escape="ignore"]');
      if (event.key === "Escape" && !inEditor) {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
      }
      if (event.key === "Tab") {
        const items = focusable();
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey, true);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey, true);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  return (
    <div
      className="modal-backdrop thin-scroll fixed inset-0 z-[70] overflow-y-auto p-3 sm:p-6"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div
        className="flex min-h-full items-start justify-center py-1 sm:items-center sm:py-2"
        onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          className={cn("modal-card relative w-full overflow-hidden rounded-[22px]", className)}
          style={{ "--accent": accent } as CSSProperties}
        >
          {showClose && (
            <button type="button" onClick={onClose} className="icon-button absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full" style={{ border: "1px solid var(--line)", background: "var(--wash)" }} aria-label="Закрыть окно">
              <X className="h-4 w-4" />
            </button>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
