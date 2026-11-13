import { useState } from 'react';
import Alert from '@/components/Alert';
import { FormError } from '@/components/form';
import Spinner from '@/components/Spinner';
import { useActiveMissionUnits } from '@/api/missionUnits';
import { unitLabel } from '@/api/units';
import { useWidgetWindows } from '@/components/widgetWindow/widgetWindowContext';
import { useDashboard } from '@/pages/dashboard/dashboardContext';
import tableStyles from '../shared/CatalogManager.module.scss';
import FilterToggle from '../shared/FilterToggle';
import FmsBadge from '../shared/FmsBadge';
import { formatTime } from '../shared/logbookEntries';
import { useUnitFunctionFilter } from '../shared/unitFunctionFilter';
import UnitFunctionFilterSection from '../shared/UnitFunctionFilterSection';
import WidgetActionBar, { WidgetAction } from '../shared/WidgetActionBar';
import { EmptyState } from '../shared/WidgetStates';
import type { WidgetProps } from '../widgetOptions';
import { useWidgetState } from '../widgetState';
import AcknowledgeRequestDialog from './AcknowledgeRequestDialog';
import { type UnitRequestRow, unitRequestKey, useUnitRequests } from './unitRequests';
import styles from './UnitRequests.module.scss';

const parseBool = (v: unknown) => (typeof v === 'boolean' ? v : undefined);

// The units' FMS 0, 5 and 9 requests, which leave their status alone and wait
// to be acknowledged: the pending ones first, the acknowledged ones dimmed
// below (until the unit reports that code again).
function UnitRequests({ options }: WidgetProps) {
  const fns = useUnitFunctionFilter(options);
  const state = useUnitRequests(fns.filter, options.currentScopeOnly === true);
  const { pending, acknowledged } = state;
  const [showAcknowledged, setShowAcknowledged] = useWidgetState(
    'showAcknowledged',
    false,
    parseBool,
  );
  const [confirming, setConfirming] = useState<UnitRequestRow | null>(null);
  const { update } = useDashboard();
  const { openWidget } = useWidgetWindows();
  const assignments = useActiveMissionUnits().byUnit;

  // Once acknowledged, a request of a unit on a mission is logged: the mission
  // is selected and a logbook entry opened with the unit as sender.
  const acknowledge = async (row: UnitRequestRow) => {
    if (!(await state.acknowledge(row))) return;
    const assignment = assignments.get(row.unit.id);
    // Without a mission the entry would go to whichever one is selected.
    if (!assignment) return;
    update({ selectedId: assignment.mission });
    openWidget('LogbookForm', { sender: unitLabel(row.unit) });
  };

  const actions = (
    <WidgetActionBar label="Unit request actions">
      <WidgetAction onClick={() => void state.reload()}>Refresh</WidgetAction>
      <FilterToggle
        open={fns.showFilters}
        active={fns.activeFilters}
        onToggle={fns.toggleFilters}
      />
      <WidgetAction pressed={showAcknowledged} onClick={() => setShowAcknowledged((v) => !v)}>
        Acknowledged{acknowledged.length > 0 && ` (${acknowledged.length})`}
      </WidgetAction>
    </WidgetActionBar>
  );

  if (state.enabled === undefined) {
    return (
      <>
        {actions}
        {state.loading ? <Spinner compact /> : <p className={styles.error}>{state.error}</p>}
      </>
    );
  }
  if (!state.enabled) {
    return (
      <>
        {actions}
        <EmptyState>No units server is configured.</EmptyState>
      </>
    );
  }

  const rows = showAcknowledged ? [...pending, ...acknowledged] : pending;
  return (
    <>
      {actions}
      {!state.connected && (
        <Alert severity="warning">
          The connection to the units server is lost; requests may be missing and cannot be
          acknowledged until it is back.
        </Alert>
      )}
      {fns.showFilters && (
        <UnitFunctionFilterSection
          functions={state.functions}
          filter={fns.filter}
          onChange={fns.setFilter}
        />
      )}
      {rows.length === 0 ? (
        <EmptyState>
          {fns.activeFilters > 0 ? 'No matching requests.' : 'No pending requests.'}
        </EmptyState>
      ) : (
        <div className={tableStyles.tableWrap}>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Unit</th>
                <th>Request</th>
                <th>
                  <span className={tableStyles.hidden}>Acknowledgement</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Row
                  key={unitRequestKey(r)}
                  row={r}
                  canAcknowledge={state.canAcknowledge}
                  acknowledging={state.acknowledging === unitRequestKey(r)}
                  onAcknowledge={() => setConfirming(r)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <FormError error={state.error} onClose={state.clearError} />
      {confirming && (
        <AcknowledgeRequestDialog
          row={confirming}
          onAcknowledge={(row) => void acknowledge(row)}
          onClose={() => setConfirming(null)}
        />
      )}
    </>
  );
}

type RowProps = {
  row: UnitRequestRow;
  canAcknowledge: boolean;
  acknowledging: boolean;
  onAcknowledge: () => void;
};

function Row({
  row: { unit, request: r },
  canAcknowledge,
  acknowledging,
  onAcknowledge,
}: RowProps) {
  const label = unitLabel(unit);
  const pending = r.acknowledged_at === null;
  // A pending request is acknowledged by clicking its row (or Enter/Space on it).
  const clickable = pending && canAcknowledge && !acknowledging;
  const className = [
    pending ? (r.code === 0 ? styles.urgent : undefined) : styles.acknowledged,
    pending && styles.pending,
    clickable && styles.clickable,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <tr
      className={className || undefined}
      tabIndex={pending ? 0 : undefined}
      aria-disabled={pending && !clickable ? true : undefined}
      title={pending ? (canAcknowledge ? 'Click to acknowledge' : undefined) : undefined}
      onClick={clickable ? onAcknowledge : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onAcknowledge();
              }
            }
          : undefined
      }
    >
      <td className={styles.nowrap}>{formatTime(r.at)}</td>
      <td>
        {label}
        {label !== unit.name && <span className={tableStyles.meta}> {unit.name}</span>}
      </td>
      <td>
        <span className={styles.request}>
          <FmsBadge code={r.code} />({unit.status && <FmsBadge code={unit.status.code} />})
        </span>
      </td>
      <td className={tableStyles.actions}>
        {pending ? (
          acknowledging && <span className="muted">Acknowledging…</span>
        ) : (
          <span className="muted" title={r.acknowledged_by ? `By ${r.acknowledged_by}` : undefined}>
            Acknowledged {r.acknowledged_at && formatTime(r.acknowledged_at)}
          </span>
        )}
      </td>
    </tr>
  );
}

export default UnitRequests;
