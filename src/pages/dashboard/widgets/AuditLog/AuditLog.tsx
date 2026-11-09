import { type FormEvent, useId, useState } from 'react';
import { type AuditEntry, auditEntityTypes } from '@/api/audit';
import { FormError } from '@/components/form';
import Spinner from '@/components/Spinner';
import { useDashboard } from '@/pages/dashboard/dashboardContext';
import { formatTime } from '../shared/logbookEntries';
import { EmptyState } from '../shared/WidgetStates';
import type { WidgetProps } from '../widgetOptions';
import { type AuditFilter, useAuditLog } from './AuditLog.ts';
import styles from './AuditLog.module.scss';

// Newest first. The entityType, entityId and actor options are the filter it
// starts with, set when another admin widget opens it.
function AuditLogWidget({ options }: WidgetProps) {
  const log = useAuditLog({
    entityType: String(options.entityType),
    entityId: String(options.entityId),
    actor: String(options.actor),
  });
  const { update } = useDashboard();

  return (
    <>
      <FilterForm
        // A new key resets the inputs when an entry's History sets the filter.
        key={JSON.stringify(log.filter)}
        filter={log.filter}
        onApply={log.setFilter}
        onRefresh={log.refresh}
      />
      {log.loading && <Spinner compact />}
      {log.page &&
        (log.page.entries.length === 0 ? (
          <EmptyState>No changes recorded.</EmptyState>
        ) : (
          <ul className="list">
            {log.page.entries.map((e) => (
              <Entry
                key={e.id}
                entry={e}
                onHistory={() =>
                  log.setFilter({ entityType: e.entity_type, entityId: e.entity_id, actor: '' })
                }
                onSelectMission={
                  e.entity_type === 'missions' && e.action !== 'delete'
                    ? () => update({ selectedId: e.entity_id })
                    : undefined
                }
              />
            ))}
          </ul>
        ))}
      <div className={styles.pager}>
        <button type="button" className="btn" disabled={!log.newer} onClick={() => log.newer?.()}>
          Newer
        </button>
        <span className="muted">Page {log.pageNumber}</span>
        <button type="button" className="btn" disabled={!log.older} onClick={() => log.older?.()}>
          Older
        </button>
      </div>
      <FormError error={log.error} onClose={() => void log.reload()} />
    </>
  );
}

function FilterForm({
  filter,
  onApply,
  onRefresh,
}: {
  filter: AuditFilter;
  onApply: (f: AuditFilter) => void;
  onRefresh: () => void;
}) {
  const [draft, setDraft] = useState(filter);
  const id = useId();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onApply({
      entityType: draft.entityType,
      entityId: draft.entityId.trim(),
      actor: draft.actor.trim(),
    });
  };
  const filtered = filter.entityType !== '' || filter.entityId !== '' || filter.actor !== '';

  return (
    <form className={styles.filters} onSubmit={submit} aria-label="Filter">
      <select
        id={`${id}-type`}
        aria-label="Entity type"
        value={draft.entityType}
        onChange={(e) => setDraft({ ...draft, entityType: e.target.value })}
      >
        <option value="">All entity types</option>
        {auditEntityTypes.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <input
        aria-label="Entity ID"
        placeholder="Entity ID"
        value={draft.entityId}
        onChange={(e) => setDraft({ ...draft, entityId: e.target.value })}
        autoComplete="off"
      />
      <input
        aria-label="Actor"
        placeholder="Actor (username)"
        value={draft.actor}
        onChange={(e) => setDraft({ ...draft, actor: e.target.value })}
        autoComplete="off"
      />
      <button type="submit" className="btn primary">
        Filter
      </button>
      {filtered && (
        <button
          type="button"
          className="btn"
          onClick={() => onApply({ entityType: '', entityId: '', actor: '' })}
        >
          Clear
        </button>
      )}
      <button type="button" className="btn" onClick={onRefresh} title="Load the newest changes">
        Refresh
      </button>
    </form>
  );
}

const actionLabels: Record<AuditEntry['action'], string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
};

// Strings as they are; anything else as JSON. Absent (null) shows a dash.
function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '–';
  return typeof v === 'string' ? v : JSON.stringify(v);
}

function Entry({
  entry: e,
  onHistory,
  onSelectMission,
}: {
  entry: AuditEntry;
  onHistory: () => void;
  onSelectMission?: () => void;
}) {
  const fields = Object.entries(e.changes);
  return (
    <li>
      <div className="content">
        <p className="primary">
          {actionLabels[e.action] ?? e.action} {e.entity_type}
        </p>
        <p className="secondary">
          {formatTime(e.occurred_at)} · {e.actor} · <code>{e.entity_id}</code>
        </p>
        {fields.length > 0 && (
          <dl className={styles.changes}>
            {fields.map(([field, c]) => (
              <div key={field} className={styles.change}>
                <dt>{field}</dt>
                <dd>
                  {e.action === 'update' && (
                    <>
                      <span className={styles.old}>{formatValue(c.old)}</span> →{' '}
                    </>
                  )}
                  {formatValue(e.action === 'delete' ? c.old : c.new)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      <div className="action row">
        <button type="button" className="btn small" onClick={onHistory}>
          History
        </button>
        {onSelectMission && (
          <button type="button" className="btn small" onClick={onSelectMission}>
            Select mission
          </button>
        )}
      </div>
    </li>
  );
}

export default AuditLogWidget;
