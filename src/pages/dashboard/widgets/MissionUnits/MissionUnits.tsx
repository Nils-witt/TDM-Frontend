import { missionUnitLabel } from '@/api/missionUnits';
import { fmsStatusLabels } from '@/api/units';
import { FormError } from '@/components/form';
import { LinkOffIcon } from '@/components/icons';
import ContextMenu from '@/components/menu/ContextMenu';
import MenuItem from '@/components/menu/MenuItem';
import { useContextMenu } from '@/components/menu/useContextMenu';
import { useWidgetWindows } from '@/components/widgetWindow/widgetWindowContext';
import { useSelectedMission } from '@/data/selectedMissionContext';
import tableStyles from '../shared/CatalogManager.module.scss';
import FmsBadge from '../shared/FmsBadge';
import { formatTime } from '../shared/logbookEntries';
import WidgetActionBar, { WidgetAction } from '../shared/WidgetActionBar';
import { EmptyState, NoMission } from '../shared/WidgetStates';
import FilterToggle from '../shared/FilterToggle';
import { useUnitFunctionFilter } from '../shared/unitFunctionFilter';
import UnitFunctionFilterSection from '../shared/UnitFunctionFilterSection';
import type { WidgetProps } from '../widgetOptions';
import { useWidgetState } from '../widgetState';
import { type MissionUnitRow, useMissionUnits } from './missionUnits';
import styles from './MissionUnits.module.scss';

const parseBool = (v: unknown) => (typeof v === 'boolean' ? v : undefined);

// The units assigned to the selected mission, with their live FMS status.
// Released ones stay listed below, dimmed.
function MissionUnits({ options }: WidgetProps) {
  const fns = useUnitFunctionFilter(options);
  const state = useMissionUnits(useSelectedMission(), fns.filter);
  const { mission, readOnly, current, released, releasing, release } = state;
  const { openWidget } = useWidgetWindows();
  const [showReleased, setShowReleased] = useWidgetState('showReleased', true, parseBool);

  const actions = (
    <WidgetActionBar label="Unit actions">
      <WidgetAction disabled={mission === null || readOnly} onClick={() => openWidget('AddUnit')}>
        Add Unit…
      </WidgetAction>
      {mission !== null && (
        <FilterToggle
          open={fns.showFilters}
          active={fns.activeFilters}
          onToggle={fns.toggleFilters}
        />
      )}
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
      {fns.showFilters && (
        <UnitFunctionFilterSection
          functions={state.functions}
          filter={fns.filter}
          onChange={fns.setFilter}
        />
      )}
      {state.loading ? null : rows.length === 0 ? (
        <EmptyState>
          {fns.activeFilters > 0
            ? 'No matching units.'
            : released.length > 0
              ? 'No units assigned any more.'
              : 'No units assigned.'}
        </EmptyState>
      ) : (
        <div className={tableStyles.tableWrap}>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>Unit</th>
                <th>Status</th>
                <th>Assigned</th>
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

function Row({
  row: { assignment: a, unit, function: fn },
  canRelease,
  releasing,
  onRelease,
}: RowProps) {
  const active = a.released_at === null;
  const label = unit ? unit.call_sign || unit.name : missionUnitLabel(a);
  const name = unit ? unit.name : a.unit_name;
  const menu = useContextMenu();
  const hasMenu = active && canRelease;
  return (
    <tr
      className={active ? undefined : styles.released}
      // Focusable so the context-menu key and Shift+F10 open the menu too.
      tabIndex={hasMenu ? 0 : undefined}
      onContextMenu={hasMenu ? menu.onContextMenu : undefined}
    >
      <td>{label ?? name}</td>
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
        {formatTime(a.created_at)}
        {!active && a.released_at && (
          <>
            <br />
            {formatTime(a.released_at)}
          </>
        )}
        {/* Portaled to the body; it sits here only to stay valid table markup. */}
        {hasMenu && (
          <ContextMenu at={menu.at} onClose={menu.close} label="Unit">
            <MenuItem icon={<LinkOffIcon />} disabled={releasing} onClick={onRelease}>
              Release
            </MenuItem>
          </ContextMenu>
        )}
      </td>
    </tr>
  );
}

export default MissionUnits;
