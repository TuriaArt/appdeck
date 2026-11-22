import { Trash2, TriangleAlert } from "lucide-react";
import type { Program } from "../data/catalog";
import { ModalShell } from "./ModalShell";

interface UninstallDialogProps {
  program: Program;
  onClose: () => void;
  onConfirm: (program: Program) => void;
}

export function UninstallDialog({ program, onClose, onConfirm }: UninstallDialogProps) {
  return (
    <ModalShell onClose={onClose} labelledBy="uninstall-title" accent="var(--danger)" className="max-w-[470px]">
      <div className="p-6 sm:p-7">
        <div className="danger-icon flex h-11 w-11 items-center justify-center rounded-xl">
          <Trash2 className="h-5 w-5" />
        </div>
        <h2 id="uninstall-title" className="display-font mt-5 pr-6 text-[23px] font-bold leading-tight text-primary">
          Удалить {program.name}?
        </h2>
        <p className="mt-3 text-[13px] leading-[1.75] text-secondary">
          Это действие нельзя отменить. Запустится uninstaller программы
        </p>
        <div className="surface-inset mt-4 flex items-start gap-2.5 rounded-xl px-3.5 py-3">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
          <p className="text-[11px] leading-[1.65] text-muted">
            Сейчас открыт браузерный прототип. Файлы и реестр не изменяются: карточка будет помечена как удалённая, а после обновления индекса исчезнет из списка.
          </p>
        </div>
        <div className="mt-6 flex justify-end gap-2.5">
          <button type="button" data-autofocus onClick={onClose} className="btn-secondary h-10 px-5">
            Отменить
          </button>
          <button type="button" onClick={() => onConfirm(program)} className="btn-danger h-10 px-5">
            <Trash2 className="h-3.5 w-3.5" />
            Удалить
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
