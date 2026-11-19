import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { addressLine, type Message } from '@/api/messages';
import { toastTimeout, useMessageArrivals, usePriorityLabel } from '@/data/messages';
import { responsivePaths } from './paths';

// The messages that arrive for the session's function, one Snackbar at a
// time (the nav's badge counts the rest); I and II stay until dismissed.
// With the Messages page, Open shows it.
function MessageSnackbarMUI({ canOpen }: { canOpen: boolean }) {
  const [queue, setQueue] = useState<Message[]>([]);
  const navigate = useNavigate();
  useMessageArrivals((arrived) => setQueue((q) => [...q, ...arrived]));
  const m = queue[0];
  const label = usePriorityLabel(m?.priority ?? 3);
  const next = () => setQueue((q) => q.slice(1));
  if (!m) return null;
  return (
    <Snackbar
      key={m.id}
      open
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      autoHideDuration={toastTimeout(m)}
      onClose={(_, reason) => {
        if (reason !== 'clickaway') next();
      }}
      message={`${label} · ${addressLine(m)}: ${m.text.slice(0, 120)}`}
      action={
        <>
          <Button color="inherit" size="small" onClick={next}>
            Dismiss
          </Button>
          {canOpen && (
            <Button
              size="small"
              variant="contained"
              onClick={() => {
                next();
                void navigate(responsivePaths.message(m.id));
              }}
            >
              Open
            </Button>
          )}
        </>
      }
    />
  );
}

export default MessageSnackbarMUI;
