import { useState } from 'react';
import {
  fetchGroups,
  type Group,
  groupMembersPath,
  type GroupMembers,
  groupsPath,
  memberName,
} from '@/api/directory';
import { useResource } from '@/api/resource';
import { FormError, SectionHeading } from '@/components/form';
import Spinner from '@/components/Spinner';
import { useWidgetWindows } from '@/components/widgetWindow/widgetWindowContext';
import { EmptyState } from '../shared/WidgetStates';
import type { WidgetProps } from '../widgetOptions';
import styles from './Groups.module.scss';

const noGroups: readonly Group[] = [];

// Read-only, from LDAP. The groupId option, set when Users opens it, chooses
// the group shown first.
function GroupsWidget({ options }: WidgetProps) {
  const { openWidget } = useWidgetWindows();
  const [selectedId, setSelectedId] = useState(String(options.groupId));
  const groups = useResource<Group[]>(groupsPath, fetchGroups);
  const members = useResource<GroupMembers>(selectedId ? groupMembersPath(selectedId) : null);
  const list = groups.data ?? noGroups;

  if (groups.data === undefined && groups.error === null) return <Spinner compact />;

  return (
    <div className={styles.split}>
      <div className={styles.pane}>
        <SectionHeading>Groups</SectionHeading>
        {list.length === 0 ? (
          <EmptyState className="">No groups yet.</EmptyState>
        ) : (
          <ul className="list select">
            {list.map((g) => (
              <li key={g.id} className={g.id === selectedId ? 'selected' : undefined}>
                <button
                  type="button"
                  aria-pressed={g.id === selectedId}
                  title={g.dn}
                  onClick={() => setSelectedId(g.id)}
                >
                  {g.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        <FormError error={groups.error} onClose={() => void groups.reload()} />
      </div>
      <div className={styles.pane}>
        <SectionHeading>
          {members.data ? `Members of ${members.data.group.name}` : 'Members'}
        </SectionHeading>
        {selectedId === '' && <EmptyState className="">Choose a group.</EmptyState>}
        {selectedId !== '' && members.data === undefined && members.error === null && (
          <Spinner compact />
        )}
        {members.data && members.data.group.id === selectedId && (
          <>
            <p className="row muted">
              <code>{members.data.group.dn}</code>
              <button
                type="button"
                className="btn"
                onClick={() => openWidget('Permissions', { groupId: selectedId })}
              >
                Permissions
              </button>
            </p>
            {members.data.members.length === 0 ? (
              <EmptyState className="">No members.</EmptyState>
            ) : (
              <ul className="list select">
                {members.data.members.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      title="Show in Users"
                      onClick={() => openWidget('Users', { userId: m.id })}
                    >
                      <span className="primary">{memberName(m)}</span>
                      {m.disabled && <span className="chip disabled">disabled</span>}
                      {m.username && m.username !== memberName(m) && (
                        <span className="secondary"> {m.username}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        <FormError error={members.error} onClose={() => void members.reload()} />
      </div>
    </div>
  );
}

export default GroupsWidget;
