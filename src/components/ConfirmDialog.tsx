import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { FormActions, FormError, WidgetForm } from './form';
import styles from './ConfirmDialog.module.scss';

type Props = {
  title: string;
  // As SectionTexts.
  message: ReactNode;
  confirmLabel: string;
  // The dialog shows the error it rejects with and stays open; the parent
  // unmounts the dialog on success.
  onConfirm: () => Promise<void>;
  onCancel: () => void;
};

// Opens when mounted; Escape, the backdrop and Cancel close it, except while
// the action is in flight.
function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  const confirm = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  const cancel = () => {
    if (!busy) onCancel();
  };

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="confirm-dialog-title"
      onCancel={(e) => {
        // Escape: closing is up to the parent, which unmounts the dialog.
        e.preventDefault();
        cancel();
      }}
      onClick={(e) => {
        // A click on the backdrop lands on the dialog element itself.
        if (e.target === e.currentTarget) cancel();
      }}
    >
      <WidgetForm onSubmit={(e) => void confirm(e)}>
        <h2 id="confirm-dialog-title">{title}</h2>
        <div className={styles.message}>{message}</div>
        <FormActions
          submitLabel={confirmLabel}
          busy={busy}
          onDiscard={cancel}
          discardLabel="Cancel"
          autoFocus
        />
        <FormError error={error} onClose={() => setError(null)} />
      </WidgetForm>
    </dialog>
  );
}

export default ConfirmDialog;
