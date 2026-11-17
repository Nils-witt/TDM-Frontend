import { useState } from 'react';
import { useOffline } from '@/api/connectivity';
import { sessionScopeName, useSession } from '@/app/session';
import { SessionDialog } from '@/app/SessionPicker';
import SymbolIcon from '@/components/symbols/SymbolIcon';
import styles from './ScopePicker.module.scss';

// The header's counterpart of the menu bar's SessionMenu: the user function
// and mission scope of the session; tapping it switches them.
function ScopePicker() {
  const { principal, session, switchSession } = useSession();
  const offline = useOffline();
  const [open, setOpen] = useState(false);
  const scope = sessionScopeName(session);

  return (
    <>
      <button
        type="button"
        className={`icon-btn ${styles.button}`}
        aria-label={`Function: ${session.function.name}, scope: ${scope}`}
        title={`You work as ${session.function.name} in ${scope}`}
        disabled={offline}
        onClick={() => setOpen(true)}
      >
        <span className={styles.name}>{scope}</span>
        <SymbolIcon name="arrow_drop_down" />
      </button>
      {open && (
        <SessionDialog
          principal={principal}
          current={{ function: session.function.id, scope: session.scope.id || null }}
          onChoose={switchSession}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

export default ScopePicker;
