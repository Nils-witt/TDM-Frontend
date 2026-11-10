import { type FormEvent, useId, useState } from 'react';
import { useOffline } from '@/api/connectivity';
import {
  deleteLayout,
  type Layout,
  type LayoutScope,
  updateLayout,
  useAllLayouts,
  useLayouts,
} from '@/api/layouts';
import { useSession } from '@/app/session';
import ConfirmDialog from '@/components/ConfirmDialog';
import { FormError, SectionHeading, SectionText } from '@/components/form';
import { DeleteIcon } from '@/components/icons';
import Spinner from '@/components/Spinner';
import { useWidgetWindows } from '@/components/widgetWindow/widgetWindowContext';
import { exportLayout } from '../../layoutFile';
import ShareDialog from '../../ShareDialog';
import { audience } from '../../sharing';
import { formatTime } from '../shared/logbookEntries';
import styles from '../shared/CatalogManager.module.scss';

type ScopeFilter = 'all' | LayoutScope;

const widgetCount = (l: Layout) => l.monitors.reduce((n, m) => n + m.widgets.length, 0);

// Every user's layouts. Writes reload the View menu's list too, which shares
// the resource cache.
function LayoutsWidget() {
  const collection = useAllLayouts();
  const { reload: reloadMine } = useLayouts();
  const { principal } = useSession();
  const { openWidget } = useWidgetWindows();
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Layout | null>(null);
  const [sharing, setSharing] = useState<Layout | null>(null);
  const id = useId();

  const reload = () => Promise.all([collection.reload(), reloadMine()]);

  const write = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      setError(null);
      await reload();
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  };

  const q = query.trim().toLowerCase();
  const rows = collection.items
    .filter((l) => scope === 'all' || l.scope === scope)
    .filter(
      (l) => q === '' || l.name.toLowerCase().includes(q) || audience(l).toLowerCase().includes(q),
    )
    .toSorted(
      (a, b) =>
        Number(a.scope !== 'global') - Number(b.scope !== 'global') ||
        Number(a.scope === 'user') - Number(b.scope === 'user') ||
        (a.owner ?? '').localeCompare(b.owner ?? '') ||
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );

  return (
    <div>
      <SectionText>
        <span className="muted">
          Every user’s dashboard layouts. A layout is usable by everyone, by the members of the
          groups it is shared with, or only by its owner. Users whose default layout is deleted or
          no longer shared with them get the built-in layout.
        </span>
      </SectionText>
      <SectionHeading>Layouts</SectionHeading>
      <div className="row">
        <label htmlFor={`${id}-scope`} className={styles.hidden}>
          Visible to
        </label>
        <select
          id={`${id}-scope`}
          value={scope}
          onChange={(e) => setScope(e.target.value as ScopeFilter)}
        >
          <option value="all">All layouts</option>
          <option value="global">Everyone</option>
          <option value="group">Groups</option>
          <option value="user">Personal</option>
        </select>
        <input
          className="grow"
          type="search"
          aria-label="Search by name, owner or group"
          placeholder="Search by name, owner or group"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {collection.loading ? (
        <Spinner compact />
      ) : (
        <div className={`${styles.tableWrap} mt`}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Visible to</th>
                <th>Monitors</th>
                <th>Widgets</th>
                <th>Changed</th>
                <th>
                  <span className={styles.hidden}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    {collection.items.length === 0 ? 'No layouts yet.' : 'No layout matches.'}
                  </td>
                </tr>
              )}
              {rows.map((l) => (
                <LayoutRow
                  key={l.id}
                  entry={l}
                  mine={l.owner === principal.username?.toLowerCase()}
                  rename={(name) => write(() => updateLayout(l.id, { name }))}
                  onShare={() => setSharing(l)}
                  onDelete={() => setDeleting(l)}
                  onHistory={() =>
                    openWidget('AuditLog', { entityType: 'dashboard_layouts', entityId: l.id })
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <FormError error={error ?? collection.error} onClose={() => setError(null)} />
      {sharing && (
        <ShareDialog
          layout={sharing}
          onSave={async (next) => {
            await updateLayout(sharing.id, next);
            setSharing(null);
            await reload();
          }}
          onCancel={() => setSharing(null)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete layout"
          message={
            <SectionText>
              Delete the {deleting.scope === 'user' ? `${deleting.owner}’s` : 'shared'} layout “
              {deleting.name}”?
            </SectionText>
          }
          confirmLabel="Delete"
          onConfirm={async () => {
            await deleteLayout(deleting.id);
            setDeleting(null);
            await reload();
          }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

type LayoutRowProps = {
  entry: Layout;
  mine: boolean;
  // false keeps the row in edit mode.
  rename: (name: string) => Promise<boolean>;
  onShare: () => void;
  onDelete: () => void;
  onHistory: () => void;
};

// While renamed, the input belongs to a form placed in the actions cell, as a
// form cannot wrap a table row.
function LayoutRow({ entry, mine, rename, onShare, onDelete, onHistory }: LayoutRowProps) {
  const [name, setName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const formId = useId();
  const offline = useOffline();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (name === null || busy) return;
    if (name.trim() === entry.name) {
      setName(null);
      return;
    }
    setBusy(true);
    const ok = await rename(name.trim());
    setBusy(false);
    if (ok) setName(null);
  };

  return (
    <tr>
      <td>
        {name !== null ? (
          <input
            form={formId}
            aria-label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
            required
          />
        ) : (
          entry.name
        )}
      </td>
      <td>
        {entry.scope === 'user' ? (
          <span className={styles.dimmed}>{entry.owner}</span>
        ) : (
          audience(entry)
        )}
        {mine && <span className="muted"> (you)</span>}
      </td>
      <td>{entry.monitors.length}</td>
      <td>{widgetCount(entry)}</td>
      <td className={styles.meta}>
        {formatTime(entry.updated_at)} · {entry.updated_by}
      </td>
      <td className={styles.actions}>
        {name !== null ? (
          <form id={formId} onSubmit={(e) => void submit(e)} className="row">
            <button type="submit" className="btn primary" disabled={busy || name.trim() === ''}>
              Save
            </button>
            <button type="button" className="btn" onClick={() => setName(null)} disabled={busy}>
              Cancel
            </button>
          </form>
        ) : (
          <span className="row">
            <button
              type="button"
              className="btn"
              disabled={offline}
              onClick={() => setName(entry.name)}
            >
              Rename
            </button>
            <button type="button" className="btn" disabled={offline} onClick={onShare}>
              Share…
            </button>
            <button type="button" className="btn" onClick={() => exportLayout(entry)}>
              Export
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

export default LayoutsWidget;
