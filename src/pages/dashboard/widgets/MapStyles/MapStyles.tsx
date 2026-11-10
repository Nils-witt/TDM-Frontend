import { type FormEvent, useId, useState } from 'react';
import { useOffline } from '@/api/connectivity';
import { type MapStyle, type MapStyleInput, mapStylesApi, useMapStyles } from '@/api/maps';
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
import { formatTime } from '../shared/logbookEntries';
import styles from '../shared/CatalogManager.module.scss';

// The browser loads the style JSON itself, without the token.
const urlPattern = 'https://.+';

// The collection is the shared one the Map widgets read, so a reload after a
// write restyles them.
function MapStylesWidget() {
  const collection = useMapStyles();
  const { openWidget } = useWidgetWindows();
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<MapStyle | null>(null);
  const radioName = useId();
  const rows = collection.items.toSorted((a, b) => a.name.localeCompare(b.name));

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
      <SectionText>
        <span className="muted">
          The MapLibre styles the Map widgets offer. A map shows the default unless its options pick
          another, and when the style it picked is deleted.
        </span>
      </SectionText>
      <SectionHeading>Map styles</SectionHeading>
      <CreateStyle
        create={async (input) => {
          await mapStylesApi.create(input);
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
                <th>Default</th>
                <th>Name</th>
                <th>Style URL</th>
                <th>Changed</th>
                <th>
                  <span className={styles.hidden}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    No map styles yet.
                  </td>
                </tr>
              )}
              {rows.map((s) => (
                <StyleRow
                  key={s.id}
                  entry={s}
                  radioName={radioName}
                  makeDefault={() =>
                    void write(() => mapStylesApi.patch(s.id, { is_default: true }))
                  }
                  save={(input) => write(() => mapStylesApi.patch(s.id, input))}
                  onDelete={() => setDeleting(s)}
                  onHistory={() =>
                    openWidget('AuditLog', { entityType: 'map_styles', entityId: s.id })
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <FormError error={error ?? collection.error} onClose={() => setError(null)} />
      {deleting && (
        <ConfirmDialog
          title="Delete map style"
          message={
            <>
              <SectionText>Delete the map style “{deleting.name}”?</SectionText>
              <SectionText>Maps that show it switch to the default.</SectionText>
            </>
          }
          confirmLabel="Delete"
          onConfirm={async () => {
            await mapStylesApi.remove(deleting.id);
            setDeleting(null);
            await collection.reload();
          }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

function CreateStyle({ create }: { create: (input: MapStyleInput) => Promise<void> }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  const offline = useOffline();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await create({ name: name.trim(), url: url.trim(), is_default: isDefault });
      setName('');
      setUrl('');
      setIsDefault(false);
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
      <Section legend="New map style">
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
        <FieldRow id={`${id}-url`} label="Style URL" marked>
          <input
            id={`${id}-url`}
            className="grow"
            type="url"
            pattern={urlPattern}
            placeholder="https://"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
        </FieldRow>
        <label className="row">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
          />
          Make it the default
        </label>
      </Section>
      <FormActions
        submitLabel="Create"
        busy={busy}
        canSubmit={name.trim() !== '' && url.trim() !== ''}
      />
      <FormError error={error} onClose={() => setError(null)} />
    </WidgetForm>
  );
}

type StyleRowProps = {
  entry: MapStyle;
  radioName: string;
  makeDefault: () => void;
  // Sends only the changed fields; false keeps the row in edit mode.
  save: (input: Partial<MapStyleInput>) => Promise<boolean>;
  onDelete: () => void;
  onHistory: () => void;
};

// While edited, the inputs belong to a form placed in the actions cell, as a
// form cannot wrap a table row.
function StyleRow({ entry, radioName, makeDefault, save, onDelete, onHistory }: StyleRowProps) {
  const [edit, setEdit] = useState<{ name: string; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const formId = useId();
  const offline = useOffline();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!edit || busy) return;
    const input: Partial<MapStyleInput> = {};
    if (edit.name.trim() !== entry.name) input.name = edit.name.trim();
    if (edit.url.trim() !== entry.url) input.url = edit.url.trim();
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
      <td>
        <input
          type="radio"
          name={radioName}
          aria-label={`Make ${entry.name} the default`}
          checked={entry.is_default}
          disabled={offline}
          onChange={makeDefault}
        />
      </td>
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
      <td>
        {edit ? (
          <input
            form={formId}
            aria-label="Style URL"
            type="url"
            pattern={urlPattern}
            value={edit.url}
            onChange={(e) => setEdit({ ...edit, url: e.target.value })}
            required
          />
        ) : (
          <span className={styles.dimmed}>{entry.url}</span>
        )}
      </td>
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
          <span className="row">
            <button
              type="button"
              className="btn"
              disabled={offline}
              onClick={() => setEdit({ name: entry.name, url: entry.url })}
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
          </span>
        )}
      </td>
    </tr>
  );
}

export default MapStylesWidget;
