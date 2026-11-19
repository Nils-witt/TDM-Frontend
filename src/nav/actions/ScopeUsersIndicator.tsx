import { useEffect, useRef } from 'react';
import { useOffline } from '@/api/connectivity';
import { useResource } from '@/api/resource';
import { fetchScopePeers, type ScopePeer, scopeSessionsPath } from '@/api/sessions';
import { sessionScopeName, useSession } from '@/app/session';
import { GroupIcon } from '@/components/icons.tsx';
import Menu from '@/components/menu/Menu.tsx';
import MenuItem from '@/components/menu/MenuItem.tsx';
import MenuSeparator from '@/components/menu/MenuSeparator.tsx';
import { formatTime } from '@/pages/dashboard/widgets/shared/logbookEntries';
import styles from './ScopeUsersIndicator.module.scss';

// Sessions are not on the event stream.
const pollMs = 30_000;

const noPeers: readonly ScopePeer[] = [];

// Who works in the session's scope, and as which user function. Hidden by an
// API older than /api/v1/sessions/current/scope.
function ScopeUsersIndicator() {
  const { session } = useSession();
  const offline = useOffline();
  const { data, error, reload } = useResource(scopeSessionsPath, fetchScopePeers);

  // A switched session works in another scope; the first load is the
  // resource's own.
  const shownSession = useRef(session.id);
  useEffect(() => {
    if (shownSession.current === session.id) return;
    shownSession.current = session.id;
    void reload();
  }, [session.id, reload]);

  useEffect(() => {
    if (offline) return;
    const id = setInterval(() => void reload(), pollMs);
    return () => clearInterval(id);
  }, [offline, reload]);

  if (data === null) return null;

  const peers = data ?? noPeers;
  const scope = sessionScopeName(session);
  const users = new Set(peers.map((p) => p.username)).size;
  const title = `${users} user${users === 1 ? '' : 's'} in ${scope}`;

  return (
    <Menu
      trigger={
        <span className={styles.trigger}>
          <GroupIcon />
          {data !== undefined && <span className={styles.count}>{users}</span>}
        </span>
      }
      className={styles.indicator}
      label={title}
      title={title}
    >
      <div className={styles.details}>
        <div className={styles.heading}>Signed in to {scope}</div>
        {offline && <div className={styles.muted}>Offline: this may be out of date.</div>}
        {error !== null && <div className={styles.error}>{error}</div>}
      </div>
      {peers.length > 0 && (
        <div className={styles.peers}>
          {peers.map((p, i) => (
            <div key={i} className={styles.peer} title={`Last seen ${formatTime(p.last_seen)}`}>
              <span className={styles.user}>
                {p.username}
                {p.own && <span className={styles.muted}> (you)</span>}
              </span>
              <span className={styles.muted}>
                {p.function.name}
                {p.uhs && <span className="chip"> UHS</span>} · since {formatTime(p.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}
      <MenuSeparator />
      <MenuItem keepOpen disabled={offline} onClick={() => void reload()}>
        Refresh
      </MenuItem>
    </Menu>
  );
}

export default ScopeUsersIndicator;
