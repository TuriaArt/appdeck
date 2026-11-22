import { CheckCircle2, Undo2, X } from "lucide-react";

interface ToastProps {
  message: string;
  action?: { label: string; onClick: () => void };
  onClose: () => void;
}

export function Toast({ message, action, onClose }: ToastProps) {
  return (
    <div
      className="toast fixed bottom-14 right-3 z-[90] flex max-w-[calc(100vw-24px)] items-center gap-2.5 rounded-xl px-3.5 py-3 sm:right-5 sm:max-w-[520px]"
      role="status"
      aria-live="polite"
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-success" style={{ background: "var(--success-soft)" }}>
        <CheckCircle2 className="h-3.5 w-3.5" />
      </span>
      <p className="min-w-0 text-[11.5px] font-medium leading-4 text-secondary">{message}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="ml-1 flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-accent transition hover:bg-white/5"
        >
          <Undo2 className="h-3 w-3" />
          {action.label}
        </button>
      )}
      <button type="button" onClick={onClose} className="icon-button flex h-6 w-6 shrink-0 items-center justify-center rounded-md" aria-label="Закрыть уведомление">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
