import { useEffect, useRef } from 'react';
import { fetchUsers, type User, usersPath } from '@/api/directory';
import { useResource } from '@/api/resource';
import { FormError } from '@/components/form';
import Spinner from '@/components/Spinner';
import { useWidgetWindows } from '@/components/widgetWindow/widgetWindowContext';
import styles from '../shared/CatalogManager.module.scss';
import type { WidgetProps } from '../widgetOptions';

const noUsers: readonly User[] = [];

// Read-only: the users come from LDAP (at login and by the sync). The userId
// option, set when Groups opens it, highlights that user.
function UsersWidget({ options }: WidgetProps) {
  const userId = String(options.userId);
  const { openWidget } = useWidgetWindows();
  const { data, error, reload } = useResource<User[]>(usersPath, fetchUsers);
  const users = data ?? noUsers;
  const highlighted = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    highlighted.current?.scrollIntoView({ block: 'nearest' });
  }, [userId, data]);

  if (data === undefined && error === null) return <Spinner compact />;

  return (
    <>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Username</th>
              <th>Name</th>
              <th>Email</th>
              <th>Groups</th>
              <th>
                <span className={styles.hidden}>Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  No users yet.
                </td>
              </tr>
            )}
            {users.map((u) => {
              const isHighlighted = u.id === userId;
              const classes = [isHighlighted && styles.highlight, u.disabled && styles.dimmed]
                .filter(Boolean)
                .join(' ');
              return (
                <tr
                  key={u.id}
                  ref={isHighlighted ? highlighted : undefined}
                  className={classes || undefined}
                >
                  <td>
                    {u.username ?? <span className="muted">(none)</span>}
                    {u.disabled && (
                      <span className="chip disabled" title="No longer in LDAP">
                        disabled
                      </span>
                    )}
                  </td>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className="row">
                      {u.groups.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          className="btn small"
                          title={g.dn}
                          onClick={() => openWidget('Groups', { groupId: g.id })}
                        >
                          {g.name}
                        </button>
                      ))}
                    </span>
                  </td>
                  <td className={styles.actions}>
                    <span className="row">
                      {u.username && (
                        <button
                          type="button"
                          className="btn"
                          title="The audit log of what this user changed"
                          onClick={() => openWidget('AuditLog', { actor: u.username })}
                        >
                          Changes by
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn"
                        title="The audit log of this user"
                        onClick={() =>
                          openWidget('AuditLog', { entityType: 'users', entityId: u.id })
                        }
                      >
                        History
                      </button>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <FormError error={error} onClose={() => void reload()} />
    </>
  );
}

export default UsersWidget;
