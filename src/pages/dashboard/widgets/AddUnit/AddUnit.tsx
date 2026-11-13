import { useId } from 'react';
import Alert from '@/components/Alert';
import { FormError } from '@/components/form';
import Spinner from '@/components/Spinner';
import { unitLabel } from '@/api/units';
import { useSelectedMission } from '@/data/selectedMissionContext';
import { useDashboard } from '../../dashboardContext';
import tableStyles from '../shared/CatalogManager.module.scss';
import FmsBadge from '../shared/FmsBadge';
import WidgetActionBar, { WidgetAction } from '../shared/WidgetActionBar';
import { EmptyState, NoMission } from '../shared/WidgetStates';
import { type AssignableUnit, useAssignUnit } from '../MissionUnits/missionUnits';
import FilterToggle from '../shared/FilterToggle';
import { useUnitFunctionFilter } from '../shared/unitFunctionFilter';
import UnitFunctionFilterSection from '../shared/UnitFunctionFilterSection';
import type { WidgetProps } from '../widgetOptions';
import { useWidgetState } from '../widgetState';
import styles from './AddUnit.module.scss';

const parseBool = (v: unknown) => (typeof v === 'boolean' ? v : undefined);

// Assigns units of the units server to the selected mission. A unit is on
// one mission at a time: one on another mission names it, and is released
// there first.
function AddUnit({ options }: WidgetProps) {
  const fns = useUnitFunctionFilter(options);
  // The All Scopes action lists the units of every scope; the option
  // currentScopeOnly is where it starts.
  const [allScopes, setAllScopes] = useWidgetState(
    'allScopes',
    options.currentScopeOnly !== true,
    parseBool,
  );
  const state = useAssignUnit(useSelectedMission(), fns.filter, !allScopes);
  const { mission, readOnly, list, assigning, assign } = state;
  const { update } = useDashboard();
  const id = useId();

  const actions = (
    <WidgetActionBar label="Add unit actions">
      <WidgetAction onClick={() => void state.reload()}>Refresh</WidgetAction>
      <FilterToggle
        open={fns.showFilters}
        active={fns.activeFilters}
        onToggle={fns.toggleFilters}
      />
      <WidgetAction pressed={allScopes} onClick={() => setAllScopes((v) => !v)}>
        All Scopes
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
  if (state.enabled === undefined) {
    return (
      <>
        {actions}
        {state.loading ? (
          <Spinner compact />
        ) : (
          <FormError error={state.error} onClose={state.clearError} />
        )}
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

  return (
    <>
      {actions}
      {!state.connected && (
        <Alert severity="warning">
          The connection to the units server is lost; the units may be out of date.
        </Alert>
      )}
      <div className="row">
        <label htmlFor={`${id}-q`} className={tableStyles.hidden}>
          Search units
        </label>
        <input
          id={`${id}-q`}
          className={styles.search}
          type="search"
          placeholder="Search by call sign or name"
          value={state.query}
          onChange={(e) => state.setQuery(e.target.value)}
        />
      </div>
      {fns.showFilters && (
        <UnitFunctionFilterSection
          functions={state.functions}
          filter={fns.filter}
          onChange={fns.setFilter}
        />
      )}
      {list.length === 0 ? (
        <EmptyState>
          {state.query || fns.activeFilters > 0
            ? 'No unit matches.'
            : !allScopes
              ? 'No unit is in the current scope.'
              : 'The units server has no units.'}
        </EmptyState>
      ) : (
        <div className={tableStyles.tableWrap}>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>Unit</th>
                <th>Function</th>
                <th>Status</th>
                <th>
                  <span className={tableStyles.hidden}>Assignment</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((u) => (
                <Row
                  key={u.unit.id}
                  item={u}
                  canAssign={!readOnly}
                  assigning={assigning === u.unit.id}
                  onAssign={() => assign(u.unit)}
                  onShowMission={(missionId) => update({ selectedId: missionId })}
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
  item: AssignableUnit;
  canAssign: boolean;
  assigning: boolean;
  onAssign: () => void;
  onShowMission: (missionId: string) => void;
};

function Row({ item: { unit, state }, canAssign, assigning, onAssign, onShowMission }: RowProps) {
  const label = unitLabel(unit);
  return (
    <tr className={state.kind === 'elsewhere' ? styles.unavailable : undefined}>
      <td>
        {label}
        {label !== unit.name && <span className={tableStyles.meta}> {unit.name}</span>}
      </td>
      <td>{unit.function}</td>
      <td>{unit.status && <FmsBadge code={unit.status.code} />}</td>
      <td className={tableStyles.actions}>
        {state.kind === 'free' && (
          <button
            type="button"
            className="btn small primary"
            disabled={!canAssign || assigning}
            onClick={onAssign}
          >
            Assign
          </button>
        )}
        {state.kind === 'here' && <span className="muted">Assigned</span>}
        {state.kind === 'elsewhere' && (
          <span className="muted">
            On{' '}
            <button
              type="button"
              className={styles.linkButton}
              title="Select that mission"
              onClick={() => onShowMission(state.missionId)}
            >
              {state.missionName || 'another mission'}
            </button>
          </span>
        )}
      </td>
    </tr>
  );
}

export default AddUnit;
