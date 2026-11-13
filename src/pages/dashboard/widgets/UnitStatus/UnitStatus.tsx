import { useMemo } from 'react';
import Alert from '@/components/Alert';
import Spinner from '@/components/Spinner';
import {
  type UnitStatusChange,
  unitFunctions,
  unitLabel,
  useUnitStatusChanges,
  useUnits,
} from '@/api/units';
import { formatTime } from '../shared/logbookEntries';
import type { WidgetProps } from '../widgetOptions';
import WidgetActionBar, { WidgetAction } from '../shared/WidgetActionBar';
import FmsBadge from '../shared/FmsBadge';
import FilterToggle from '../shared/FilterToggle';
import { useUnitFunctionFilter } from '../shared/unitFunctionFilter';
import UnitFunctionFilterSection from '../shared/UnitFunctionFilterSection';
import { EmptyState } from '../shared/WidgetStates';
import tableStyles from '../shared/CatalogManager.module.scss';
import styles from './UnitStatus.module.scss';

// The latest FMS status changes of the units server's units, newest first.
// The API pushes them through the event stream, so the list follows them
// without polling. The changes do not name the unit's function, so the
// optional function filter takes it from the current units: the changes of a
// unit the units server no longer has are hidden while it is set.
function UnitStatus({ options }: WidgetProps) {
  const limit = Number(options.limit);
  const { data, error, reload } = useUnitStatusChanges(limit);
  const units = useUnits();
  const fns = useUnitFunctionFilter(options);

  const functionOf = useMemo(
    () => new Map((units.data?.units ?? []).map((u) => [u.id, u.function])),
    [units.data],
  );
  const functions = useMemo(() => unitFunctions(functionOf.values()), [functionOf]);
  const changes = useMemo(
    () =>
      fns.filter.size === 0
        ? data?.changes
        : (data?.changes ?? []).filter((c) => {
            const f = functionOf.get(c.unit_id);
            return f !== undefined && fns.filter.has(f);
          }),
    [data, fns.filter, functionOf],
  );

  const actions = (
    <WidgetActionBar label="Unit status actions">
      <WidgetAction onClick={() => void reload()}>Refresh</WidgetAction>
      <FilterToggle
        open={fns.showFilters}
        active={fns.activeFilters}
        onToggle={fns.toggleFilters}
      />
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
      {fns.showFilters && (
        <UnitFunctionFilterSection
          functions={functions}
          filter={fns.filter}
          onChange={fns.setFilter}
        />
      )}
      {!changes || changes.length === 0 ? (
        <EmptyState>
          {fns.activeFilters > 0 && data.changes.length > 0
            ? 'No matching status changes.'
            : 'No status changes yet.'}
        </EmptyState>
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
              {changes.map((c) => (
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
