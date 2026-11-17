import { useState } from 'react';
import { useOffline } from '@/api/connectivity';
import { sessionScopeName, useSession } from '@/app/session';
import { SessionDialog } from '@/app/SessionPicker';
import Menu from '@/components/menu/Menu';
import MenuItem from '@/components/menu/MenuItem';

// The user function and mission scope the user works as, chosen at sign-in.
// Switching starts a new session; every tab of the browser follows.
function SessionMenu() {
  const { principal, session, switchSession } = useSession();
  const offline = useOffline();
  const [open, setOpen] = useState(false);
  const scope = sessionScopeName(session);
  const label = `${session.function.name} · ${scope}`;

  return (
    <>
      <Menu
        trigger={label}
        label={`Function: ${session.function.name}, scope: ${scope}`}
        title={`You work as ${session.function.name} in ${scope}; new missions are created there`}
        tourId="scope"
      >
        <MenuItem onClick={() => setOpen(true)} disabled={offline}>
          Switch Function or Scope
        </MenuItem>
      </Menu>
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

export default SessionMenu;
