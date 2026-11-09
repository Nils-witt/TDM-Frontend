import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import { type FormEvent, type ReactNode, useId, useState } from 'react';

// Runs action; on rejection shows its error and stays open. The parent
// unmounts the dialog on success. Escape, the backdrop and Cancel close it,
// except while the action is in flight.
function useDialogAction(onCancel: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };
  const cancel = () => {
    if (!busy) onCancel();
  };
  return { busy, error, setError, run, cancel };
}

function DialogShell({
  title,
  onCancel,
  onSubmit,
  children,
}: {
  title: string;
  onCancel: () => void;
  onSubmit: (e: FormEvent) => void;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <Dialog
      open
      onClose={onCancel}
      aria-labelledby={id}
      fullWidth
      maxWidth="xs"
      slotProps={{ paper: { component: 'form', onSubmit } }}
    >
      <DialogTitle id={id}>{title}</DialogTitle>
      {children}
    </Dialog>
  );
}

// As ConfirmDialog.
export function ConfirmDialogMUI({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}) {
  const { busy, error, setError, run, cancel } = useDialogAction(onCancel);
  return (
    <DialogShell
      title={title}
      onCancel={cancel}
      onSubmit={(e) => {
        e.preventDefault();
        void run(onConfirm);
      }}
    >
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={cancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={busy} autoFocus>
          {confirmLabel}
        </Button>
      </DialogActions>
    </DialogShell>
  );
}

// As RevokeDialog: the reason is required and passed trimmed.
export function RevokeDialogMUI({
  subject,
  onRevoke,
  onCancel,
}: {
  subject: string;
  onRevoke: (reason: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();
  const { busy, error, setError, run, cancel } = useDialogAction(onCancel);
  return (
    <DialogShell
      title="Revoke entry"
      onCancel={cancel}
      onSubmit={(e) => {
        e.preventDefault();
        if (trimmed !== '') void run(() => onRevoke(trimmed));
      }}
    >
      <DialogContent>
        <DialogContentText sx={{ whiteSpace: 'pre-wrap', color: 'text.primary', mb: 1 }}>
          {subject}
        </DialogContentText>
        <DialogContentText variant="body2">
          It stays in the logbook, crossed out. This cannot be undone.
        </DialogContentText>
        <TextField
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          multiline
          minRows={3}
          required
          autoFocus
          fullWidth
          disabled={busy}
          placeholder="Why is this entry revoked?"
          margin="normal"
        />
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={cancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={busy || trimmed === ''}>
          Revoke
        </Button>
      </DialogActions>
    </DialogShell>
  );
}

// As the dashboard Map's New mission dialog: the occurred event is required.
export function NewMissionDialogMUI({
  where,
  onCreate,
  onCancel,
}: {
  where: string;
  onCreate: (occurredEvent: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [event, setEvent] = useState('');
  const trimmed = event.trim();
  const { busy, error, setError, run, cancel } = useDialogAction(onCancel);
  return (
    <DialogShell
      title="New mission"
      onCancel={cancel}
      onSubmit={(e) => {
        e.preventDefault();
        if (trimmed !== '') void run(() => onCreate(trimmed));
      }}
    >
      <DialogContent>
        <TextField
          label="Occurred event"
          value={event}
          onChange={(e) => setEvent(e.target.value)}
          required
          autoFocus
          fullWidth
          disabled={busy}
          margin="dense"
        />
        <DialogContentText variant="body2" sx={{ mt: 1 }}>
          At {where}
        </DialogContentText>
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={cancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={busy || trimmed === ''}>
          Create
        </Button>
      </DialogActions>
    </DialogShell>
  );
}
