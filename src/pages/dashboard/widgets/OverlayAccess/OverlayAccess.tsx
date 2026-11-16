import { type FormEvent, useMemo, useState } from 'react';
import { useOffline } from '@/api/connectivity';
import {
  fetchGroups,
  fetchUsers,
  type Group,
  groupsPath,
  memberName,
  type User,
  usersPath,
} from '@/api/directory';
import {
  fetchOverlayAccess,
  type OverlayAccess,
  overlayAccessApi,
  overlayAccessPath,
  useOverlays,
} from '@/api/maps';
import { useResource } from '@/api/resource';
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
import { formatTime } from '../shared/logbookEntries';
import { EmptyState } from '../shared/WidgetStates';
import split from '../Groups/Groups.module.scss';
import styles from './OverlayAccess.module.scss';

const byName = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' });
const noAccess: readonly OverlayAccess[] = [];
const noUsers: readonly User[] = [];
const noGroups: readonly Group[] = [];

type Row = { id: string; name: string; description: string; gone: boolean };

// Which users and groups see each tile server overlay. Only admins see an
// overlay until it is granted to others.
function OverlayAccessWidget() {
  const { overlays, error: overlaysError } = useOverlays();
  const access = useResource<OverlayAccess[]>(overlayAccessPath, fetchOverlayAccess);
  const users = useResource<User[]>(usersPath, fetchUsers);
  const [selectedId, setSelectedId] = useState('');
  const rules = access.data ?? noAccess;

  const rows = useMemo<Row[]>(() => {
    const listed = (overlays?.overlays ?? []).map((o) => ({
      id: o.id,
      name: o.name || o.id,
      description: o.description,
      gone: false,
    }));
    const ids = new Set(listed.map((o) => o.id));
    // Grants of overlays the tile server dropped stay until revoked.
    const gone = rules
      .filter((r) => !ids.has(r.overlay_id))
      .map((r) => ({ id: r.overlay_id, name: r.overlay_id, description: '', gone: true }));
    return [...listed, ...gone];
  }, [overlays, rules]);

  if (overlaysError)
    return <FormError error={`Overlays: ${overlaysError}`} onClose={() => undefined} />;
  if (!overlays || (access.data === undefined && access.error === null)) return <Spinner compact />;
  if (!overlays.enabled) {
    return (
      <SectionText>
        <span className="muted">The API has no tile server, so there are no overlays.</span>
      </SectionText>
    );
  }

  const selected = rows.find((r) => r.id === selectedId);
  const ruleOf = (id: string) => rules.find((r) => r.overlay_id === id);

  return (
    <div>
      <SectionText>
        <span className="muted">
          Who sees each overlay on the maps. Only admins see an overlay until it is shared with
          everyone or with users and groups.
        </span>
      </SectionText>
      <div className={split.split}>
        <div className={split.pane}>
          <SectionHeading>Overlays</SectionHeading>
          {rows.length === 0 ? (
            <EmptyState className="">The tile server has no overlays.</EmptyState>
          ) : (
            <ul className="list select">
              {rows.map((o) => {
                const rule = ruleOf(o.id);
                return (
                  <li key={o.id} className={o.id === selectedId ? 'selected' : undefined}>
                    <button
                      type="button"
                      aria-pressed={o.id === selectedId}
                      title={o.description || o.id}
                      onClick={() => setSelectedId(o.id)}
                    >
                      {o.name}
                      <span className={`muted ${styles.status}`}>
                        {o.gone && 'No longer on the tile server · '}
                        {grantSummary(rule)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <FormError error={access.error} onClose={() => void access.reload()} />
        </div>
        <div className={split.pane}>
          <SectionHeading>{selected ? `Access to ${selected.name}` : 'Access'}</SectionHeading>
          {!selected && <EmptyState className="">Choose an overlay.</EmptyState>}
          {selected && (
            // Keyed so switching overlays drops unsaved changes.
            <AccessForm
              key={selected.id}
              overlayId={selected.id}
              rule={ruleOf(selected.id)}
              users={users.data ?? noUsers}
              usersError={users.error}
              onSaved={() => void access.reload()}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function grantSummary(r: OverlayAccess | undefined) {
  if (!r) return 'Admins only';
  if (r.everyone) return 'Everyone';
  const parts = [
    r.users.length > 0 && `${r.users.length} user${r.users.length === 1 ? '' : 's'}`,
    r.groups.length > 0 && `${r.groups.length} group${r.groups.length === 1 ? '' : 's'}`,
  ].filter(Boolean);
  return parts.length === 0 ? 'Admins only' : parts.join(', ');
}

// Admins only is a grant of no one, which saving revokes.
type Draft = { everyone: boolean; users: string[]; groups: string[] };

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((x) => b.includes(x));

function AccessForm({
  overlayId,
  rule,
  users,
  usersError,
  onSaved,
}: {
  overlayId: string;
  rule: OverlayAccess | undefined;
  users: readonly User[];
  usersError: string | null;
  onSaved: () => void;
}) {
  const directory = useResource<Group[]>(groupsPath, fetchGroups);
  const offline = useOffline();
  const { openWidget } = useWidgetWindows();
  const stored: Draft = {
    everyone: rule?.everyone ?? false,
    users: rule?.users ?? [],
    groups: rule?.groups ?? [],
  };
  // null: unchanged, showing what the API has.
  const [draft, setDraft] = useState<Draft | null>(null);
  const [filter, setFilter] = useState('');
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = draft ?? stored;
  const dirty =
    draft !== null &&
    (draft.everyone !== stored.everyone ||
      !sameSet(draft.users, stored.users) ||
      !sameSet(draft.groups, stored.groups));
  const tooMany = current.users.length > 256 || current.groups.length > 64;

  // The API accepts enabled users only, but keeps those listed already.
  const offeredUsers = users
    .filter((u) => !u.disabled || current.users.includes(u.id))
    .toSorted((a, b) => byName(memberName(a), memberName(b)));
  const needle = filter.trim().toLowerCase();
  const shownUsers =
    needle === ''
      ? offeredUsers
      : offeredUsers.filter(
          (u) =>
            current.users.includes(u.id) ||
            memberName(u).toLowerCase().includes(needle) ||
            u.username?.toLowerCase().includes(needle),
        );
  // Listed users the directory no longer has.
  const unknownUsers = current.users.filter((id) => !users.some((u) => u.id === id));
  const groupNames = [
    ...new Set([...(directory.data ?? noGroups).map((g) => g.name), ...current.groups]),
  ].sort(byName);

  const change = (next: Partial<Draft>) => setDraft({ ...current, ...next });
  const toggle = (list: string[], value: string, on: boolean) =>
    on ? [...list, value] : list.filter((x) => x !== value);

  const addTyped = () => {
    const name = typed.trim();
    if (name !== '' && !current.groups.includes(name))
      change({ groups: [...current.groups, name] });
    setTyped('');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft || busy) return;
    setBusy(true);
    try {
      const nobody = !draft.everyone && draft.users.length === 0 && draft.groups.length === 0;
      if (nobody) await overlayAccessApi.revoke(overlayId);
      // Users and groups picked before choosing Everyone are kept, so
      // switching back finds them.
      else await overlayAccessApi.grant(overlayId, draft);
      setDraft(null);
      setError(null);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <WidgetForm onSubmit={(e) => void submit(e)}>
      <Section legend="Visible to" disabled={offline || busy}>
        <label className="row">
          <input
            type="radio"
            name={`${overlayId}-mode`}
            checked={current.everyone}
            onChange={() => change({ everyone: true })}
          />
          Everyone
        </label>
        <label className="row">
          <input
            type="radio"
            name={`${overlayId}-mode`}
            checked={!current.everyone}
            onChange={() => change({ everyone: false })}
          />
          Admins and the users and groups below
        </label>
      </Section>
      {!current.everyone && (
        <>
          <Section legend="Users" disabled={offline || busy}>
            <input
              className="grow"
              type="search"
              aria-label="Find users"
              placeholder="Find users"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <div className={styles.checkList} role="group" aria-label="Users">
              {shownUsers.length === 0 && unknownUsers.length === 0 && (
                <span className="muted">No users found.</span>
              )}
              {shownUsers.map((u) => (
                <label key={u.id} className="row" title={u.username}>
                  <input
                    type="checkbox"
                    checked={current.users.includes(u.id)}
                    onChange={(e) =>
                      change({ users: toggle(current.users, u.id, e.target.checked) })
                    }
                  />
                  {memberName(u)}
                  {u.disabled && <span className="muted"> (disabled)</span>}
                </label>
              ))}
              {unknownUsers.map((id) => (
                <label key={id} className="row">
                  <input
                    type="checkbox"
                    checked
                    onChange={() => change({ users: toggle(current.users, id, false) })}
                  />
                  <span className="muted">{id} (unknown user)</span>
                </label>
              ))}
            </div>
            <FormError error={usersError} onClose={() => undefined} />
          </Section>
          <Section legend="Groups" disabled={offline || busy}>
            <div className={styles.checkList} role="group" aria-label="Groups">
              {groupNames.length === 0 && <span className="muted">No groups found.</span>}
              {groupNames.map((name) => (
                <label key={name} className="row">
                  <input
                    type="checkbox"
                    checked={current.groups.includes(name)}
                    onChange={(e) =>
                      change({ groups: toggle(current.groups, name, e.target.checked) })
                    }
                  />
                  {name}
                </label>
              ))}
            </div>
            {/* For groups only the identity provider knows. */}
            <div className="row">
              <input
                className="grow"
                aria-label="Other group name"
                placeholder="Other group name"
                maxLength={200}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTyped();
                  }
                }}
              />
              <button
                type="button"
                className="btn"
                onClick={addTyped}
                disabled={typed.trim() === ''}
              >
                Add
              </button>
            </div>
            <FormError error={directory.error} onClose={() => void directory.reload()} />
          </Section>
          {current.users.length === 0 && current.groups.length === 0 && (
            <SectionText>
              <span className="muted">
                No users or groups picked: only admins see this overlay.
              </span>
            </SectionText>
          )}
        </>
      )}
      <FormActions
        submitLabel="Save"
        busy={busy}
        canSubmit={dirty && !offline && !tooMany}
        dirty={dirty}
        onDiscard={() => setDraft(null)}
        aside={
          <span className="muted">
            {rule && `${formatTime(rule.updated_at)} · ${rule.updated_by} `}
            <button
              type="button"
              className="btn"
              onClick={() => openWidget('AuditLog', { entityType: 'overlay_access', entityId: '' })}
            >
              History
            </button>
          </span>
        }
      />
      <FormError error={error} onClose={() => setError(null)} />
    </WidgetForm>
  );
}

export default OverlayAccessWidget;
