import { useState } from 'react';
import {
  fetchGroups,
  fetchUsers,
  type Group,
  groupsPath,
  type User,
  usersPath,
} from '@/api/directory';
import {
  fetchGroupPermissions,
  fetchPermissionCatalog,
  groupPermissionsApi,
  groupPermissionsPath,
  type PermissionInfo,
  permissionsPath,
  userPermissionsApi,
  userPermissionsPath,
} from '@/api/permissions';
import { useResource, useResourceCache } from '@/api/resource';
import { FormError, SectionHeading, SectionText } from '@/components/form';
import Spinner from '@/components/Spinner';
import { useWidgetWindows } from '@/components/widgetWindow/widgetWindowContext';
import PermissionChecklist from '../shared/PermissionChecklist';
import { EmptyState } from '../shared/WidgetStates';
import type { WidgetProps } from '../widgetOptions';
import styles from '../Groups/Groups.module.scss';

type Subject = { id: string; name: string; title?: string };

const noGroups: readonly Group[] = [];
const noUsers: readonly User[] = [];

// The personal permissions granted to groups and users. Functional ones are
// granted to user functions (the User Functions widget). The groupId option,
// set by Groups, chooses the group shown first.
function PermissionsWidget({ options }: WidgetProps) {
  const [tab, setTab] = useState<'groups' | 'users'>('groups');
  const [selectedId, setSelectedId] = useState(String(options.groupId));
  const groups = useResource<Group[]>(groupsPath, fetchGroups);
  const users = useResource<User[]>(usersPath, fetchUsers);
  const catalog = useResource<PermissionInfo[]>(permissionsPath, fetchPermissionCatalog);

  const subjects: Subject[] =
    tab === 'groups'
      ? (groups.data ?? noGroups).map((g) => ({ id: g.id, name: g.name, title: g.dn }))
      : (users.data ?? noUsers).map((u) => ({ id: u.id, name: u.username ?? u.name ?? u.id }));
  const list = subjects.toSorted((a, b) => a.name.localeCompare(b.name));
  const selected = list.find((s) => s.id === selectedId);
  const source = tab === 'groups' ? groups : users;

  if (source.data === undefined && source.error === null) return <Spinner compact />;

  return (
    <div>
      <SectionText>
        <span className="muted">
          Personal permissions, which always apply, granted to the members of a group or to a user.
          The admin group holds every one. Missions, patients and units are granted to user
          functions.
        </span>
      </SectionText>
      <div className="row">
        <button
          type="button"
          className="btn small"
          aria-pressed={tab === 'groups'}
          onClick={() => {
            setTab('groups');
            setSelectedId('');
          }}
        >
          Groups
        </button>
        <button
          type="button"
          className="btn small"
          aria-pressed={tab === 'users'}
          onClick={() => {
            setTab('users');
            setSelectedId('');
          }}
        >
          Users
        </button>
      </div>
      <div className={styles.split}>
        <div className={styles.pane}>
          <SectionHeading>{tab === 'groups' ? 'Groups' : 'Users'}</SectionHeading>
          {list.length === 0 ? (
            <EmptyState className="">Nothing yet.</EmptyState>
          ) : (
            <ul className="list select">
              {list.map((s) => (
                <li key={s.id} className={s.id === selectedId ? 'selected' : undefined}>
                  <button
                    type="button"
                    aria-pressed={s.id === selectedId}
                    title={s.title}
                    onClick={() => setSelectedId(s.id)}
                  >
                    {s.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <FormError error={source.error} onClose={() => void source.reload()} />
        </div>
        <div className={styles.pane}>
          <SectionHeading>
            {selected ? `Permissions of ${selected.name}` : 'Permissions'}
          </SectionHeading>
          {selectedId === '' && (
            <EmptyState className="">Choose a {tab === 'groups' ? 'group' : 'user'}.</EmptyState>
          )}
          {selectedId !== '' && catalog.data === undefined && catalog.error === null && (
            <Spinner compact />
          )}
          {selectedId !== '' && catalog.data && (
            // Keyed so switching drops unsaved changes.
            <Grants key={tab + selectedId} tab={tab} id={selectedId} catalog={catalog.data} />
          )}
          <FormError error={catalog.error} onClose={() => void catalog.reload()} />
        </div>
      </div>
    </div>
  );
}

function Grants({
  tab,
  id,
  catalog,
}: {
  tab: 'groups' | 'users';
  id: string;
  catalog: PermissionInfo[];
}) {
  const path = tab === 'groups' ? groupPermissionsPath(id) : userPermissionsPath(id);
  const granted = useResource<string[]>(path, fetchGroupPermissions);
  const cache = useResourceCache();
  const { openWidget } = useWidgetWindows();

  if (granted.data === undefined) {
    return granted.error === null ? (
      <Spinner compact />
    ) : (
      <FormError error={granted.error} onClose={() => void granted.reload()} />
    );
  }

  const save = async (permissions: string[]) => {
    const saved =
      tab === 'groups'
        ? await groupPermissionsApi.replace(id, permissions)
        : await userPermissionsApi.replace(id, permissions);
    cache.put(path, saved);
    return saved;
  };

  return (
    <PermissionChecklist
      catalog={catalog}
      kind="personal"
      granted={granted.data}
      onSave={save}
      aside={
        <button
          type="button"
          className="btn"
          onClick={() =>
            openWidget('AuditLog', {
              entityType: tab === 'groups' ? 'group_permissions' : 'user_permissions',
            })
          }
        >
          History
        </button>
      }
    />
  );
}

export default PermissionsWidget;
