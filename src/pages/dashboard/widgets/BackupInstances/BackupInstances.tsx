import { type FormEvent, useId, useState } from 'react';
import {
  type BackupInstance,
  type BackupInstanceInput,
  backupInstancesApi,
  backupStatusPath,
  useBackupInstances,
} from '@/api/backup';
import { useOffline } from '@/api/connectivity';
import { useResourceCache } from '@/api/resource';
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

// The API keeps the token in the clear only towards loopback hosts.
const urlPattern = 'https://.+|http://(localhost|127\\.0\\.0\\.1|\\[::1\\])([:/].*)?';

const parseJobs = (text: string) =>
  text
    .split(',')
    .map((j) => j.trim())
    .filter((j) => j !== '');

// The go-backup-tool instances the menu bar's backup status shows. Their
// tokens never come back from the API: an edit leaves the token field empty
// and keeps the stored one unless a new one is typed.
function BackupInstancesWidget() {
  const collection = useBackupInstances();
  const cache = useResourceCache();
  const { openWidget } = useWidgetWindows();
  const offline = useOffline();
  const [editing, setEditing] = useState<BackupInstance | 'new' | null>(null);
  const [deleting, setDeleting] = useState<BackupInstance | null>(null);
  const rows = collection.items.toSorted((a, b) => a.name.localeCompare(b.name));

  // The status reloads with the event of the write too; this shows it at once.
  const reloadAll = async () => {
    cache.reloadShown((path) => path === backupStatusPath);
    await collection.reload();
  };

  return (
    <div>
      <SectionText>
        <span className="muted">
          The go-backup-tool instances whose jobs the menu bar's backup status shows. The API asks
          them with their dashboard API token (view permission), which never reaches the browser.
        </span>
      </SectionText>
      <SectionHeading>Backup servers</SectionHeading>
      {collection.loading ? (
        <Spinner compact />
      ) : (
        <div className={`${styles.tableWrap} mt`}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>URL</th>
                <th>Shown jobs</th>
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
                    No backup servers yet.
                  </td>
                </tr>
              )}
              {rows.map((b) => (
                <tr key={b.id}>
                  <td>{b.name}</td>
                  <td>
                    <span className={styles.dimmed}>{b.url}</span>
                    {!b.has_token && <span className="muted"> · no token</span>}
                  </td>
                  <td>
                    {b.jobs.length === 0 ? <span className="muted">All</span> : b.jobs.join(', ')}
                  </td>
                  <td className={styles.meta}>
                    {formatTime(b.updated_at)} · {b.updated_by}
                  </td>
                  <td className={styles.actions}>
                    <span className="row">
                      <button
                        type="button"
                        className="btn"
                        disabled={offline}
                        onClick={() => setEditing(b)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() =>
                          openWidget('AuditLog', { entityType: 'backup_instances', entityId: b.id })
                        }
                      >
                        History
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Delete ${b.name}`}
                        title="Delete"
                        disabled={offline}
                        onClick={() => setDeleting(b)}
                      >
                        <DeleteIcon />
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Closing it tries again. */}
      <FormError error={collection.error} onClose={() => void collection.reload()} />
      {editing === null ? (
        !offline && (
          <div className="mt">
            <button type="button" className="btn" onClick={() => setEditing('new')}>
              Add Backup Server…
            </button>
          </div>
        )
      ) : (
        <InstanceForm
          key={editing === 'new' ? 'new' : editing.id}
          entry={editing === 'new' ? null : editing}
          save={async (input) => {
            if (editing === 'new') await backupInstancesApi.create(input as BackupInstanceInput);
            else await backupInstancesApi.patch(editing.id, input);
            setEditing(null);
            await reloadAll();
          }}
          onCancel={() => setEditing(null)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete backup server"
          message={
            <>
              <SectionText>Delete the backup server “{deleting.name}”?</SectionText>
              <SectionText>Its token is deleted with it.</SectionText>
            </>
          }
          confirmLabel="Delete"
          onConfirm={async () => {
            await backupInstancesApi.remove(deleting.id);
            setDeleting(null);
            if (editing !== null && editing !== 'new' && editing.id === deleting.id) {
              setEditing(null);
            }
            await reloadAll();
          }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

type InstanceFormProps = {
  // null creates one.
  entry: BackupInstance | null;
  // Gets every field on create, only the changed ones on edit.
  save: (input: Partial<BackupInstanceInput>) => Promise<void>;
  onCancel: () => void;
};

function InstanceForm({ entry, save, onCancel }: InstanceFormProps) {
  const [name, setName] = useState(entry?.name ?? '');
  const [url, setUrl] = useState(entry?.url ?? '');
  const [jobs, setJobs] = useState(entry?.jobs.join(', ') ?? '');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();

  const input = (): Partial<BackupInstanceInput> => {
    const all = { name: name.trim(), url: url.trim(), jobs: parseJobs(jobs), token: token.trim() };
    if (!entry) return all;
    const changed: Partial<BackupInstanceInput> = {};
    if (all.name !== entry.name) changed.name = all.name;
    if (all.url !== entry.url) changed.url = all.url;
    if (all.jobs.join('\n') !== entry.jobs.join('\n')) changed.jobs = all.jobs;
    if (all.token !== '') changed.token = all.token;
    return changed;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const changes = input();
    if (Object.keys(changes).length === 0) {
      onCancel();
      return;
    }
    setBusy(true);
    try {
      await save(changes);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  const needsToken = !entry?.has_token;

  return (
    <WidgetForm onSubmit={(e) => void submit(e)}>
      <Section legend={entry ? `Edit ${entry.name}` : 'New backup server'}>
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
        <FieldRow id={`${id}-url`} label="URL" marked>
          <input
            id={`${id}-url`}
            className="grow"
            type="url"
            pattern={urlPattern}
            placeholder="https://backup.example.org"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
        </FieldRow>
        <FieldRow id={`${id}-token`} label="API token" marked={needsToken}>
          <input
            id={`${id}-token`}
            className="grow"
            type="password"
            placeholder={needsToken ? '' : 'Unchanged'}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="new-password"
            required={needsToken}
          />
        </FieldRow>
        <FieldRow id={`${id}-jobs`} label="Shown jobs">
          <input
            id={`${id}-jobs`}
            className="grow"
            placeholder="All, or names separated by commas"
            value={jobs}
            onChange={(e) => setJobs(e.target.value)}
            autoComplete="off"
          />
        </FieldRow>
      </Section>
      <FormActions
        submitLabel={entry ? 'Save' : 'Create'}
        busy={busy}
        canSubmit={name.trim() !== '' && url.trim() !== '' && (!needsToken || token.trim() !== '')}
        onDiscard={onCancel}
        discardLabel="Cancel"
      />
      <FormError error={error} onClose={() => setError(null)} />
    </WidgetForm>
  );
}

export default BackupInstancesWidget;
