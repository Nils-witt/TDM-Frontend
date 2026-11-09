import { type ReactNode, useEffect, useId, useRef } from 'react';
import { WidgetForm } from '@/components/form';
import styles from '@/components/ConfirmDialog.module.scss';

// Opens when mounted; Escape and the backdrop close it, unless busy.
export function ReportDialog({
  title,
  busy,
  onSubmit,
  onClose,
  children,
}: {
  title: string;
  busy: boolean;
  onSubmit: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const id = useId();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={`${id}-title`}
      onCancel={(e) => {
        // Escape: closing is up to the parent, which unmounts the dialog.
        e.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(e) => {
        // A click on the backdrop lands on the dialog element itself.
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <WidgetForm
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <h2 id={`${id}-title`}>{title}</h2>
        {children}
      </WidgetForm>
    </dialog>
  );
}
