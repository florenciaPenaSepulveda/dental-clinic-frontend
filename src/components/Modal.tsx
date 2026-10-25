import { ReactNode, useEffect, useRef } from "react";

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

const Modal = ({ open, title, onClose, children }: Props) => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog ref={ref} className="modal" onClose={onClose}>
      <div className="modal-box max-w-lg">
        <h3 className="mb-4 text-lg font-semibold text-primary">{title}</h3>
        {children}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button aria-label="Cerrar">cerrar</button>
      </form>
    </dialog>
  );
};

export default Modal;
