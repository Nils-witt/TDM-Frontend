import { type FormEvent, useState } from 'react';
import { useOffline } from '@/api/connectivity';
import { fetchGroups, type Group, groupsPath } from '@/api/directory';
import {
  fetchGroupPermissions,
  fetchPermissionCatalog,
  groupPermissionsApi,
  groupPermissionsPath,
  impliedPermissions,
  type PermissionInfo,
  permissionsPath,
} from '@/api/permissions';
import { useResource, useResourceCache } from '@/api/resource';
import {
  FormActions,
  FormError,
  Section,
  SectionHeading,
  SectionText,
  WidgetForm,
} from '@/components/form';
import Spinner from '@/components/Spinner';
import { useWidgetWindows } from '@/components/widgetWindow/widgetWindowContext';
import { EmptyState } from '../shared/WidgetStates';
import type { WidgetProps } from '../widgetOptions';
import styles from '../Groups/Groups.module.scss';

const noGroups: readonly Group[] = [];

// The groupId option, set by Groups, chooses the group shown first.
function PermissionsWidget({ options }: WidgetProps) {
  const [selectedId, setSelectedId] = useState(String(options.groupId));
  const groups = useResource<Group[]>(groupsPath, fetchGroups);
  const catalog = useResource<PermissionInfo[]>(permissionsPath, fetchPermissionCatalog);
  const list = (groups.data ?? noGroups).toSorted((a, b) => a.name.localeCompare(b.name));
  const selected = list.find((g) => g.id === selectedId);

  if (groups.data === undefined && groups.error === null) return <Spinner compact />;

  return (
    <div>
      <SectionText>
        <span className="muted">
          What the members of a group may do besides the defaults. The admin group holds every
          permission.
        </span>
      </SectionText>
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
            {selected ? `Permissions of ${selected.name}` : 'Permissions'}
          </SectionHeading>
          {selectedId === '' && <EmptyState className="">Choose a group.</EmptyState>}
          {selectedId !== '' && catalog.data === undefined && catalog.error === null && (
            <Spinner compact />
          )}
          {selectedId !== '' && catalog.data && (
            // Keyed so switching groups drops unsaved changes.
            <GroupPermissions key={selectedId} groupId={selectedId} catalog={catalog.data} />
          )}
          <FormError error={catalog.error} onClose={() => void catalog.reload()} />
        </div>
      </div>
    </div>
  );
}

function GroupPermissions({ groupId, catalog }: { groupId: string; catalog: PermissionInfo[] }) {
  const path = groupPermissionsPath(groupId);
  const granted = useResource<string[]>(path, fetchGroupPermissions);
  const cache = useResourceCache();
  const offline = useOffline();
  const { openWidget } = useWidgetWindows();
  // null: unchanged, showing what the API has.
  const [draft, setDraft] = useState<Set<string> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (granted.data === undefined) {
    return granted.error === null ? (
      <Spinner compact />
    ) : (
      <FormError error={granted.error} onClose={() => void granted.reload()} />
    );
  }

  const current = draft ?? new Set(granted.data);
  const implied = new Set([...current].flatMap((p) => impliedPermissions[p] ?? []));

  const toggle = (name: string, on: boolean) => {
    const next = new Set(current);
    if (on) next.add(name);
    else next.delete(name);
    setDraft(next);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft || busy) return;
    setBusy(true);
    try {
      // An implied permission is not stored on its own, so the API answers
      // the same however the draft got there.
      const saved = await groupPermissionsApi.replace(
        groupId,
        [...draft].filter((p) => !implied.has(p)),
      );
      cache.put(path, saved);
      setDraft(null);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <WidgetForm onSubmit={(e) => void submit(e)}>
      <Section legend="Granted">
        {catalog.length === 0 && <EmptyState className="">No grantable permissions.</EmptyState>}
        {catalog.map((p) => {
          const isImplied = implied.has(p.name);
          return (
            <label key={p.name} className="row" title={p.name}>
              <input
                type="checkbox"
                checked={current.has(p.name) || isImplied}
                disabled={offline || busy || isImplied}
                onChange={(e) => toggle(p.name, e.target.checked)}
              />
              <span>
                <code>{p.name}</code>
                {isImplied && <span className="muted"> (implied)</span>}
                <br />
                <span className="muted">{p.description}</span>
              </span>
            </label>
          );
        })}
      </Section>
      <FormActions
        submitLabel="Save"
        busy={busy}
        canSubmit={draft !== null && !offline}
        onDiscard={() => setDraft(null)}
        dirty={draft !== null}
        aside={
          <button
            type="button"
            className="btn"
            onClick={() => openWidget('AuditLog', { entityType: 'group_permissions' })}
          >
            History
          </button>
        }
      />
      <FormError error={error} onClose={() => setError(null)} />
    </WidgetForm>
  );
}

export default PermissionsWidget;
