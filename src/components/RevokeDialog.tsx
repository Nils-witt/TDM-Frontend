import { type FormEvent, useEffect, useId, useRef, useState } from 'react';
import { FieldRow, FormActions, FormError, SectionText, WidgetForm } from './form';
import styles from './RevokeDialog.module.scss';

type Props = {
  // Quoted in the dialog, such as the entry's text.
  subject: string;
  // Gets the trimmed reason. The dialog shows the error it rejects with and
  // stays open; the parent unmounts the dialog on success.
  onRevoke: (reason: string) => Promise<void>;
  onCancel: () => void;
};

// The reason is required. Opens when mounted; Escape, the backdrop and Cancel
// close it, except while the revoke is in flight.
function RevokeDialog({ subject, onRevoke, onCancel }: Props) {
  const id = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  const trimmed = reason.trim();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (trimmed === '' || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onRevoke(trimmed);
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
      aria-labelledby={`${id}-title`}
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
      <WidgetForm onSubmit={(e) => void submit(e)}>
        <h2 id={`${id}-title`}>Revoke entry</h2>
        <SectionText className={styles.subject}>{subject}</SectionText>
        <SectionText>
          <span className="muted">
            It stays in the logbook, crossed out. This cannot be undone.
          </span>
        </SectionText>
        <FieldRow id={`${id}-reason`} label="Reason" marked>
          <textarea
            id={`${id}-reason`}
            className="grow"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            required
            autoFocus
            disabled={busy}
            placeholder="Why is this entry revoked?"
          />
        </FieldRow>
        <FormActions
          submitLabel="Revoke"
          canSubmit={trimmed !== ''}
          busy={busy}
          onDiscard={cancel}
          discardLabel="Cancel"
        />
        <FormError error={error} onClose={() => setError(null)} />
      </WidgetForm>
    </dialog>
  );
}

export default RevokeDialog;
