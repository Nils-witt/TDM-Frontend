import { useState } from 'react';
import type { ApiSession } from '@/api/auth';
import { useOffline } from '@/api/connectivity';
import { useResource } from '@/api/resource';
import { fetchSessions, sessionApi, sessionsPath } from '@/api/sessions';
import { useCan, useSession } from '@/app/session';
import ConfirmDialog from '@/components/ConfirmDialog';
import { FormError } from '@/components/form';
import Spinner from '@/components/Spinner';
import styles from '../shared/CatalogManager.module.scss';

const noSessions: readonly ApiSession[] = [];

const when = (iso: string) => new Date(iso).toLocaleString();

// Every user's active sessions (sessions.view); ending one (sessions.manage)
// sends its user back to the function picker.
function SessionsWidget() {
  const { data, error, reload } = useResource<ApiSession[]>(sessionsPath, fetchSessions);
  const { session: own } = useSession();
  const manage = useCan('sessions.manage');
  const offline = useOffline();
  const [ending, setEnding] = useState<ApiSession | null>(null);
  const sessions = data ?? noSessions;

  if (data === undefined && error === null) return <Spinner compact />;

  return (
    <>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>User</th>
              <th>Function</th>
              <th>Scope</th>
              <th>Since</th>
              <th>Last seen</th>
              <th>
                <span className={styles.hidden}>Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  No active sessions.
                </td>
              </tr>
            )}
            {sessions.map((s) => (
              <tr key={s.id} title={s.user_agent || undefined}>
                <td>
                  {s.username}
                  {s.id === own.id && <span className="chip"> this session</span>}
                </td>
                <td>
                  {s.function.name}
                  {s.uhs && <span className="chip"> UHS</span>}
                </td>
                <td>{s.scope.id === '' ? 'Default' : s.scope.name}</td>
                <td>{when(s.created_at)}</td>
                <td>{when(s.last_seen)}</td>
                <td>
                  <button
                    type="button"
                    className="btn small"
                    disabled={!manage.allowed || offline}
                    title={manage.hint}
                    onClick={() => setEnding(s)}
                  >
                    End
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <FormError error={error} onClose={() => void reload()} />
      {ending && (
        <ConfirmDialog
          title={`End the session of ${ending.username}?`}
          message={`${ending.username} has to choose a function again.`}
          confirmLabel="End Session"
          onCancel={() => setEnding(null)}
          onConfirm={async () => {
            await sessionApi.end(ending.id);
            setEnding(null);
            await reload();
          }}
        />
      )}
    </>
  );
}

export default SessionsWidget;
