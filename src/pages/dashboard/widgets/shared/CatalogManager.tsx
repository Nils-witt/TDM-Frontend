import { type FormEvent, useId, useState } from 'react';
import { useOffline } from '@/api/connectivity';
import type { AuditEntityType } from '@/api/audit';
import type { CatalogApi, CatalogEntry, CatalogInput } from '@/api/catalogs';
import type { Collection } from '@/api/collection';
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
import { DeleteIcon } from '@/components/icons';
import Spinner from '@/components/Spinner';
import { useWidgetWindows } from '@/components/widgetWindow/widgetWindowContext';
import { formatTime } from './logbookEntries';
import styles from './CatalogManager.module.scss';

// For mission types, whose parent is their mission type group.
type Parents = { label: string; collection: Collection<CatalogEntry> };

type Props<T extends CatalogEntry> = {
  // Such as "logbook type".
  noun: string;
  heading: string;
  // Opens the entry's history in the audit log.
  entityType: AuditEntityType;
  collection: Collection<T>;
  api: CatalogApi<T>;
  // After "Delete the <noun> "<name>"?".
  deleteNote: string;
  parents?: Parents;
  // With a description per entry (mission types).
  describe?: boolean;
};

const parentId = (t: CatalogEntry) =>
  'group_id' in t && typeof t.group_id === 'string' ? t.group_id : '';

const descriptionOf = (t: CatalogEntry) =>
  'description' in t && typeof t.description === 'string' ? t.description : '';

const byName = (a: CatalogEntry, b: CatalogEntry) => a.name.localeCompare(b.name);

// The collection is the shared one of useCatalogs(), so a reload after a write
// updates every widget that offers the entries. Deleted entries are not listed
// by the API, so they disappear here too.
function CatalogManager<T extends CatalogEntry>({
  noun,
  heading,
  entityType,
  collection,
  api,
  deleteNote,
  parents,
  describe = false,
}: Props<T>) {
  const { openWidget } = useWidgetWindows();
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<T | null>(null);

  const parentName = (t: T) => {
    const id = parentId(t);
    return parents?.collection.byId.get(id)?.name ?? '';
  };
  // Grouped by parent, entries of a deleted parent last.
  const rows = collection.items.toSorted((a, b) => {
    if (parents) {
      const pa = parentName(a);
      const pb = parentName(b);
      if (pa !== pb) return pa === '' ? 1 : pb === '' ? -1 : pa.localeCompare(pb);
    }
    return byName(a, b);
  });
  const columns = 3 + (parents ? 1 : 0) + (describe ? 1 : 0);

  const write = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      setError(null);
      await collection.reload();
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  };

  return (
    <div>
      <SectionHeading>{heading}</SectionHeading>
      <CreateEntry
        noun={noun}
        parents={parents}
        describe={describe}
        create={async (input) => {
          await api.create(input);
          await collection.reload();
        }}
      />
      {collection.loading ? (
        <Spinner compact />
      ) : (
        <div className={`${styles.tableWrap} mt`}>
          <table className={styles.table}>
            <thead>
              <tr>
                {parents && <th>{parents.label}</th>}
                <th>Name</th>
                {describe && <th>Description</th>}
                <th>Changed</th>
                <th>
                  <span className={styles.hidden}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={columns} className="muted">
                    No {noun}s yet.
                  </td>
                </tr>
              )}
              {rows.map((t) => (
                <EntryRow
                  key={t.id}
                  entry={t}
                  parents={parents}
                  describe={describe}
                  parentName={parentName(t)}
                  save={(input) => write(() => api.patch(t.id, input))}
                  onDelete={() => setDeleting(t)}
                  onHistory={() => openWidget('AuditLog', { entityType, entityId: t.id })}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <FormError error={error ?? collection.error} onClose={() => setError(null)} />
      {deleting && (
        <ConfirmDialog
          title={`Delete ${noun}`}
          message={
            <>
              <SectionText>
                Delete the {noun} “{deleting.name}”?
              </SectionText>
              {deleteNote && <SectionText>{deleteNote}</SectionText>}
            </>
          }
          confirmLabel="Delete"
          onConfirm={async () => {
            await api.remove(deleting.id);
            setDeleting(null);
            await collection.reload();
          }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

// With parents the chosen parent stays selected for the next entry.
function CreateEntry({
  noun,
  parents,
  describe,
  create,
}: {
  noun: string;
  parents?: Parents;
  describe: boolean;
  create: (input: CatalogInput) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [parent, setParent] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  const offline = useOffline();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const input: CatalogInput = { name: name.trim() };
      if (parents) input.group_id = parent;
      if (describe) input.description = description.trim();
      await create(input);
      setName('');
      setDescription('');
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Offline nothing can be created.
  if (offline) return null;

  return (
    <WidgetForm onSubmit={(e) => void submit(e)}>
      <Section legend={`New ${noun}`}>
        {parents && (
          <FieldRow id={`${id}-parent`} label={parents.label} marked>
            <select
              id={`${id}-parent`}
              className="grow"
              value={parent}
              onChange={(e) => setParent(e.target.value)}
              required
            >
              <option value="">Choose…</option>
              {parents.collection.items.toSorted(byName).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </FieldRow>
        )}
        <FieldRow id={`${id}-name`} label="Name" marked>
          <input
            id={`${id}-name`}
            className="grow"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
            required
          />
        </FieldRow>
        {describe && (
          <FieldRow id={`${id}-description`} label="Description">
            <textarea
              id={`${id}-description`}
              className="grow"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FieldRow>
        )}
      </Section>
      <FormActions submitLabel="Create" busy={busy} canSubmit={name.trim() !== ''} />
      <FormError error={error} onClose={() => setError(null)} />
    </WidgetForm>
  );
}

type EntryRowProps = {
  entry: CatalogEntry;
  parents?: Parents;
  describe: boolean;
  parentName: string;
  // Sends only the changed fields; false keeps the row in edit mode.
  save: (input: Partial<CatalogInput>) => Promise<boolean>;
  onDelete: () => void;
  onHistory: () => void;
};

// While edited, the inputs belong to a form placed in the actions cell, as a
// form cannot wrap a table row.
function EntryRow({
  entry,
  parents,
  describe,
  parentName,
  save,
  onDelete,
  onHistory,
}: EntryRowProps) {
  const [edit, setEdit] = useState<{ name: string; parent: string; description: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const formId = useId();
  const offline = useOffline();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!edit || busy) return;
    const input: Partial<CatalogInput> = {};
    if (edit.name.trim() !== entry.name) input.name = edit.name.trim();
    if (parents && edit.parent !== parentId(entry)) input.group_id = edit.parent;
    if (describe && edit.description.trim() !== descriptionOf(entry)) {
      input.description = edit.description.trim();
    }
    if (Object.keys(input).length === 0) {
      setEdit(null);
      return;
    }
    setBusy(true);
    const ok = await save(input);
    setBusy(false);
    if (ok) setEdit(null);
  };

  return (
    <tr>
      {parents && (
        <td>
          {edit ? (
            <select
              form={formId}
              aria-label={parents.label}
              value={edit.parent}
              onChange={(e) => setEdit({ ...edit, parent: e.target.value })}
              required
            >
              {parentName === '' && <option value={edit.parent}>(deleted)</option>}
              {parents.collection.items.toSorted(byName).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          ) : parentName === '' ? (
            <span className="muted">(deleted)</span>
          ) : (
            parentName
          )}
        </td>
      )}
      <td>
        {edit ? (
          <input
            form={formId}
            aria-label="Name"
            value={edit.name}
            onChange={(e) => setEdit({ ...edit, name: e.target.value })}
            autoComplete="off"
            required
          />
        ) : (
          entry.name
        )}
      </td>
      {describe && (
        <td className={styles.description}>
          {edit ? (
            <input
              form={formId}
              aria-label="Description"
              value={edit.description}
              onChange={(e) => setEdit({ ...edit, description: e.target.value })}
              autoComplete="off"
            />
          ) : (
            <span className="muted" title={descriptionOf(entry) || undefined}>
              {descriptionOf(entry)}
            </span>
          )}
        </td>
      )}
      <td className={styles.meta}>
        {formatTime(entry.updated_at)} · {entry.updated_by}
      </td>
      <td className={styles.actions}>
        {edit ? (
          <form id={formId} onSubmit={(e) => void submit(e)} className="row">
            <button type="submit" className="btn primary" disabled={busy}>
              Save
            </button>
            <button type="button" className="btn" onClick={() => setEdit(null)} disabled={busy}>
              Cancel
            </button>
          </form>
        ) : (
          <div >
            <button
              type="button"
              className="btn"
              disabled={offline}
              onClick={() =>
                setEdit({
                  name: entry.name,
                  parent: parentId(entry),
                  description: descriptionOf(entry),
                })
              }
            >
              Edit
            </button>
            <button type="button" className="btn" onClick={onHistory}>
              History
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label={`Delete ${entry.name}`}
              title="Delete"
              disabled={offline}
              onClick={onDelete}
            >
              <DeleteIcon />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

export default CatalogManager;
