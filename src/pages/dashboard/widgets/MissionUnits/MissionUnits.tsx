import { missionUnitLabel } from '@/api/missionUnits';
import { fmsStatusLabels } from '@/api/units';
import { FormError } from '@/components/form';
import { useWidgetWindows } from '@/components/widgetWindow/widgetWindowContext';
import { useSelectedMission } from '@/data/selectedMissionContext';
import tableStyles from '../shared/CatalogManager.module.scss';
import FmsBadge from '../shared/FmsBadge';
import { formatTime } from '../shared/logbookEntries';
import WidgetActionBar, { WidgetAction } from '../shared/WidgetActionBar';
import { EmptyState, NoMission } from '../shared/WidgetStates';
import { useWidgetState } from '../widgetState';
import { type MissionUnitRow, useMissionUnits } from './missionUnits';
import styles from './MissionUnits.module.scss';

const parseBool = (v: unknown) => (typeof v === 'boolean' ? v : undefined);

// The units assigned to the selected mission, with their live FMS status.
// Released ones stay listed below, dimmed.
function MissionUnits() {
  const state = useMissionUnits(useSelectedMission());
  const { mission, readOnly, current, released, releasing, release } = state;
  const { openWidget } = useWidgetWindows();
  const [showReleased, setShowReleased] = useWidgetState('showReleased', true, parseBool);

  const actions = (
    <WidgetActionBar label="Unit actions">
      <WidgetAction disabled={mission === null || readOnly} onClick={() => openWidget('AddUnit')}>
        Add Unit…
      </WidgetAction>
      <WidgetAction pressed={showReleased} onClick={() => setShowReleased((v) => !v)}>
        Released{released.length > 0 && ` (${released.length})`}
      </WidgetAction>
    </WidgetActionBar>
  );

  if (mission === null) {
    return (
      <>
        {actions}
        <NoMission className="mt" />
      </>
    );
  }
  const rows = showReleased ? [...current, ...released] : current;
  return (
    <>
      {actions}
      {state.loading ? null : rows.length === 0 ? (
        <EmptyState>
          {released.length > 0 ? 'No units assigned any more.' : 'No units assigned.'}
        </EmptyState>
      ) : (
        <div className={tableStyles.tableWrap}>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>Unit</th>
                <th>Status</th>
                <th>Assigned</th>
                <th>
                  <span className={tableStyles.hidden}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Row
                  key={r.assignment.id}
                  row={r}
                  canRelease={!readOnly}
                  releasing={releasing === r.assignment.id}
                  onRelease={() => release(r.assignment)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <FormError error={state.error} onClose={state.clearError} />
    </>
  );
}

type RowProps = {
  row: MissionUnitRow;
  canRelease: boolean;
  releasing: boolean;
  onRelease: () => void;
};

function Row({ row: { assignment: a, unit }, canRelease, releasing, onRelease }: RowProps) {
  const active = a.released_at === null;
  const label = unit ? unit.call_sign || unit.name : missionUnitLabel(a);
  const name = unit ? unit.name : a.unit_name;
  return (
    <tr className={active ? undefined : styles.released}>
      <td>
        {label}
        {name && name !== label && <span className={tableStyles.meta}> {name}</span>}
      </td>
      <td>
        {active && unit?.status ? (
          <span className={styles.status} title={fmsStatusLabels[unit.status.code]}>
            <FmsBadge code={unit.status.code} />
          </span>
        ) : (
          <span className="muted">{active && !unit ? 'unknown' : ''}</span>
        )}
      </td>
      <td className={tableStyles.meta}>
        {formatTime(a.created_at)} · {a.created_by}
        {!active && a.released_at && (
          <>
            <br />
            released {formatTime(a.released_at)} · {a.released_by}
          </>
        )}
      </td>
      <td className={tableStyles.actions}>
        {active && (
          <button
            type="button"
            className="btn small"
            disabled={!canRelease || releasing}
            onClick={onRelease}
          >
            Release
          </button>
        )}
      </td>
    </tr>
  );
}

export default MissionUnits;
