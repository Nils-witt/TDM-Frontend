import Alert from '@/components/Alert';
import Spinner from '@/components/Spinner';
import { type UnitStatusChange, unitLabel, useUnitStatusChanges } from '@/api/units';
import { formatTime } from '../shared/logbookEntries';
import type { WidgetProps } from '../widgetOptions';
import WidgetActionBar, { WidgetAction } from '../shared/WidgetActionBar';
import FmsBadge from '../shared/FmsBadge';
import { EmptyState } from '../shared/WidgetStates';
import tableStyles from '../shared/CatalogManager.module.scss';
import styles from './UnitStatus.module.scss';

// The latest FMS status changes of the units server's units, newest first.
// The API pushes them through the event stream, so the list follows them
// without polling.
function UnitStatus({ options }: WidgetProps) {
  const limit = Number(options.limit);
  const { data, error, reload } = useUnitStatusChanges(limit);

  const actions = (
    <WidgetActionBar label="Unit status actions">
      <WidgetAction onClick={() => void reload()}>Refresh</WidgetAction>
    </WidgetActionBar>
  );

  if (!data) {
    return (
      <>
        {actions}
        {error === null ? <Spinner compact /> : <p className={styles.error}>{error}</p>}
      </>
    );
  }
  if (!data.enabled) {
    return (
      <>
        {actions}
        <EmptyState>No units server is configured.</EmptyState>
      </>
    );
  }

  return (
    <>
      {actions}
      {!data.connected && (
        <Alert severity="warning">
          The connection to the units server is lost; changes may be missing until it is back.
        </Alert>
      )}
      {error !== null && <p className={styles.error}>{error}</p>}
      {data.changes.length === 0 ? (
        <EmptyState>No status changes yet.</EmptyState>
      ) : (
        <div className={tableStyles.tableWrap}>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Unit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.changes.map((c) => (
                <Change key={`${c.unit_id}/${c.at}/${c.to ?? ''}`} change={c} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Change({ change: c }: { change: UnitStatusChange }) {
  const label = unitLabel(c);
  return (
    <tr>
      <td className={styles.nowrap} title={`Received ${formatTime(c.received_at)}`}>
        {formatTime(c.at)}
      </td>
      <td>
        {label}
        {label !== c.name && <span className={tableStyles.meta}> {c.name}</span>}
      </td>
      <td>
        <span className={styles.transition}>
          {c.from !== null && (
            <>
              <FmsBadge code={c.from} />
              <span className="muted" aria-label="to">
                →
              </span>
            </>
          )}
          {c.to === null ? (
            <span className="muted">cleared</span>
          ) : (
            <>
              <FmsBadge code={c.to} />
            </>
          )}
        </span>
      </td>
    </tr>
  );
}

export default UnitStatus;
