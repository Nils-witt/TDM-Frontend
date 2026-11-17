import { type FormEvent, useState } from 'react';
import { useOffline } from '@/api/connectivity';
import { fetchGroups, type Group, groupsPath } from '@/api/directory';
import { fetchPermissionCatalog, type PermissionInfo, permissionsPath } from '@/api/permissions';
import { useResource } from '@/api/resource';
import {
  fetchUserFunctions,
  type ResponsivePage,
  responsivePageIds,
  type UserFunction,
  userFunctionApi,
  userFunctionsPath,
  type View,
  viewIds,
} from '@/api/sessions';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  FieldRow,
  FormActions,
  FormError,
  Section,
  SectionHeading,
  SectionText,
  WidgetForm,
} from '@/components/form';
import Spinner from '@/components/Spinner';
import { useWidgetWindows } from '@/components/widgetWindow/widgetWindowContext';
import PermissionChecklist from '../shared/PermissionChecklist';
import { EmptyState } from '../shared/WidgetStates';
import styles from '../Groups/Groups.module.scss';

const noFunctions: readonly UserFunction[] = [];

const viewLabels: Record<View, string> = { desktop: 'Desktop', responsive: 'Responsive' };
const pageLabels: Record<ResponsivePage, string> = {
  missions: 'Missions',
  archive: 'Archive',
  map: 'Map',
  reports: 'Reports',
};

type ViewsDraft = { views: Set<View>; pages: Set<ResponsivePage> };

const toggled = <T,>(set: Set<T>, value: T, on: boolean) => {
  const next = new Set(set);
  if (on) next.add(value);
  else next.delete(value);
  return next;
};
const noGroups: readonly Group[] = [];

// The user functions a user chooses one of at sign-in: their functional
// permissions (missions, patients, units) and the groups that may choose
// them. Admins only.
function UserFunctionsWidget() {
  const functions = useResource<UserFunction[]>(userFunctionsPath, fetchUserFunctions);
  const catalog = useResource<PermissionInfo[]>(permissionsPath, fetchPermissionCatalog);
  const groups = useResource<Group[]>(groupsPath, fetchGroups);
  const offline = useOffline();
  const [selectedId, setSelectedId] = useState('');
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const list = functions.data ?? noFunctions;
  const selected = list.find((f) => f.id === selectedId);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    try {
      const f = await userFunctionApi.create(name, '');
      setNewName('');
      setError(null);
      await functions.reload();
      setSelectedId(f.id);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (functions.data === undefined && functions.error === null) return <Spinner compact />;

  return (
    <div>
      <SectionText>
        <span className="muted">
          A user works as one function, chosen at sign-in, in one mission scope. Users whose groups
          grant no function cannot sign in. Admins may also choose All permissions.
        </span>
      </SectionText>
      <div className={styles.split}>
        <div className={styles.pane}>
          <SectionHeading>Functions</SectionHeading>
          {list.length === 0 ? (
            <EmptyState className="">No functions yet.</EmptyState>
          ) : (
            <ul className="list select">
              {list.map((f) => (
                <li key={f.id} className={f.id === selectedId ? 'selected' : undefined}>
                  <button
                    type="button"
                    aria-pressed={f.id === selectedId}
                    title={f.description || undefined}
                    onClick={() => setSelectedId(f.id)}
                  >
                    {f.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form className="row" onSubmit={(e) => void create(e)}>
            <input
              value={newName}
              placeholder="New function"
              aria-label="Name of the new function"
              disabled={offline}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button type="submit" className="btn" disabled={offline || !newName.trim()}>
              Add
            </button>
          </form>
          <FormError error={error ?? functions.error} onClose={() => setError(null)} />
        </div>
        <div className={styles.pane}>
          {!selected && <EmptyState className="">Choose a function.</EmptyState>}
          {selected && catalog.data && (
            <FunctionEditor
              key={selected.id}
              fn={selected}
              catalog={catalog.data}
              groups={groups.data ?? noGroups}
              onChanged={() => void functions.reload()}
              onDeleted={() => {
                setSelectedId('');
                void functions.reload();
              }}
            />
          )}
          <FormError error={catalog.error ?? groups.error} onClose={() => void catalog.reload()} />
        </div>
      </div>
    </div>
  );
}

type EditorProps = {
  fn: UserFunction;
  catalog: PermissionInfo[];
  groups: readonly Group[];
  onChanged: () => void;
  onDeleted: () => void;
};

function FunctionEditor({ fn, catalog, groups, onChanged, onDeleted }: EditorProps) {
  const offline = useOffline();
  const { openWidget } = useWidgetWindows();
  const [name, setName] = useState(fn.name);
  const [description, setDescription] = useState(fn.description);
  const [groupDraft, setGroupDraft] = useState<Set<string> | null>(null);
  const [viewsDraft, setViewsDraft] = useState<ViewsDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const dirty = name !== fn.name || description !== fn.description;
  const chosenGroups = groupDraft ?? new Set(fn.groups);
  // An API older than views allows every view and page.
  const chosenViews = viewsDraft ?? {
    views: new Set(fn.views ?? viewIds),
    pages: new Set(fn.responsive_pages ?? responsivePageIds),
  };

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
      setError(null);
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const saveDetails = (e: FormEvent) => {
    e.preventDefault();
    if (!dirty || busy) return;
    void run(() => userFunctionApi.update(fn.id, { name, description }));
  };

  const saveGroups = (e: FormEvent) => {
    e.preventDefault();
    if (!groupDraft || busy) return;
    void run(async () => {
      await userFunctionApi.setGroups(fn.id, [...groupDraft]);
      setGroupDraft(null);
    });
  };

  const saveViews = (e: FormEvent) => {
    e.preventDefault();
    if (!viewsDraft || viewsDraft.views.size === 0 || busy) return;
    void run(async () => {
      await userFunctionApi.setViews(
        fn.id,
        viewIds.filter((v) => viewsDraft.views.has(v)),
        responsivePageIds.filter((p) => viewsDraft.pages.has(p)),
      );
      setViewsDraft(null);
    });
  };

  const sortedGroups = groups.toSorted((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <WidgetForm onSubmit={saveDetails}>
        <Section legend="Function">
          <FieldRow id="user-function-name" label="Name">
            <input
              id="user-function-name"
              value={name}
              maxLength={100}
              disabled={offline || busy}
              onChange={(e) => setName(e.target.value)}
            />
          </FieldRow>
          <FieldRow id="user-function-description" label="Description">
            <textarea
              id="user-function-description"
              value={description}
              maxLength={1000}
              rows={2}
              disabled={offline || busy}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FieldRow>
        </Section>
        <FormActions
          submitLabel="Save"
          busy={busy}
          canSubmit={dirty && !offline && name.trim() !== ''}
          dirty={dirty}
          onDiscard={() => {
            setName(fn.name);
            setDescription(fn.description);
          }}
          aside={
            <>
              <button
                type="button"
                className="btn"
                onClick={() =>
                  openWidget('AuditLog', { entityType: 'user_functions', entityId: fn.id })
                }
              >
                History
              </button>
              <button
                type="button"
                className="btn danger"
                disabled={offline || busy}
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </button>
            </>
          }
        />
      </WidgetForm>
      <FormError error={error} onClose={() => setError(null)} />

      <SectionHeading>Functional permissions</SectionHeading>
      <PermissionChecklist
        catalog={catalog}
        kind="functional"
        granted={fn.permissions}
        onSave={async (permissions) => {
          const saved = await userFunctionApi.setPermissions(fn.id, permissions);
          onChanged();
          return saved.permissions;
        }}
      />

      <SectionHeading>Views</SectionHeading>
      <SectionText>
        <span className="muted">
          Where a session of the function works, and which pages the responsive view shows (Settings
          always). Permissions still decide what it may see and change.
        </span>
      </SectionText>
      <WidgetForm onSubmit={saveViews}>
        <Section legend="Views">
          {viewIds.map((v) => (
            <label key={v} className="row">
              <input
                type="checkbox"
                checked={chosenViews.views.has(v)}
                disabled={offline || busy}
                onChange={(e) =>
                  setViewsDraft({
                    ...chosenViews,
                    views: toggled(chosenViews.views, v, e.target.checked),
                  })
                }
              />
              <span>{viewLabels[v]}</span>
            </label>
          ))}
          {chosenViews.views.size === 0 && <span className="muted">Choose at least one view.</span>}
        </Section>
        <Section legend="Responsive pages">
          {responsivePageIds.map((p) => (
            <label key={p} className="row">
              <input
                type="checkbox"
                checked={chosenViews.pages.has(p)}
                disabled={offline || busy || !chosenViews.views.has('responsive')}
                onChange={(e) =>
                  setViewsDraft({
                    ...chosenViews,
                    pages: toggled(chosenViews.pages, p, e.target.checked),
                  })
                }
              />
              <span>{pageLabels[p]}</span>
            </label>
          ))}
        </Section>
        <FormActions
          submitLabel="Save"
          busy={busy}
          canSubmit={viewsDraft !== null && viewsDraft.views.size > 0 && !offline}
          dirty={viewsDraft !== null}
          onDiscard={() => setViewsDraft(null)}
        />
      </WidgetForm>

      <SectionHeading>Groups that may choose it</SectionHeading>
      <WidgetForm onSubmit={saveGroups}>
        <Section legend="Groups">
          {sortedGroups.length === 0 && <EmptyState className="">No groups yet.</EmptyState>}
          {sortedGroups.map((g) => (
            <label key={g.id} className="row" title={g.dn}>
              <input
                type="checkbox"
                checked={chosenGroups.has(g.id)}
                disabled={offline || busy}
                onChange={(e) => {
                  const next = new Set(chosenGroups);
                  if (e.target.checked) next.add(g.id);
                  else next.delete(g.id);
                  setGroupDraft(next);
                }}
              />
              <span>{g.name}</span>
            </label>
          ))}
        </Section>
        <FormActions
          submitLabel="Save"
          busy={busy}
          canSubmit={groupDraft !== null && !offline}
          dirty={groupDraft !== null}
          onDiscard={() => setGroupDraft(null)}
        />
      </WidgetForm>

      {confirmDelete && (
        <ConfirmDialog
          title={`Delete ${fn.name}?`}
          message="Its grants are removed, and everyone working as it has to choose a function again."
          confirmLabel="Delete"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={async () => {
            await userFunctionApi.remove(fn.id);
            setConfirmDelete(false);
            onDeleted();
          }}
        />
      )}
    </div>
  );
}

export default UserFunctionsWidget;
