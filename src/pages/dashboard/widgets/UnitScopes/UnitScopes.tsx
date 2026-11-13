import { useId, useMemo, useState } from 'react';
import Alert from '@/components/Alert';
import { FormError } from '@/components/form';
import Spinner from '@/components/Spinner';
import { useOffline } from '@/api/connectivity';
import { useErrorState } from '@/api/resource';
import { unitScopeOf, useUnitScopes } from '@/api/unitScopes';
import { type Unit, unitFunctions, unitLabel, useUnits } from '@/api/units';
import { useCatalogs } from '@/data/catalogContext';
import { defaultScopeName, scopeOptions } from '@/data/selectedScope';
import tableStyles from '../shared/CatalogManager.module.scss';
import FilterToggle from '../shared/FilterToggle';
import FmsBadge from '../shared/FmsBadge';
import { matchesFunction, useUnitFunctionFilter } from '../shared/unitFunctionFilter';
import UnitFunctionFilterSection from '../shared/UnitFunctionFilterSection';
import WidgetActionBar, { WidgetAction } from '../shared/WidgetActionBar';
import { EmptyState } from '../shared/WidgetStates';
import type { WidgetProps } from '../widgetOptions';
import { useWidgetState } from '../widgetState';
import styles from './UnitScopes.module.scss';

// The select's value for Default; scope IDs are UUIDs.
const defaultScope = '';
// The scope filter's value for every scope.
const allScopes = '*';

const parseString = (v: unknown) => (typeof v === 'string' ? v : undefined);

// Puts the units of the units server into mission scopes, one each; a unit in
// none is in Default. The unit widgets show the units of the tab's scope.
function UnitScopes({ options }: WidgetProps) {
  const units = useUnits();
  const unitScopes = useUnitScopes();
  const scopes = useCatalogs().scopes;
  const offline = useOffline();
  const fns = useUnitFunctionFilter(options);
  const [query, setQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useWidgetState('scope', allScopes, parseString);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useErrorState(unitScopes.error);
  const id = useId();

  const sortedScopes = useMemo(() => scopeOptions(scopes.items), [scopes.items]);
  const scopeOf = (unitId: string) => unitScopeOf(unitScopes.byUnit, scopes.byId, unitId);
  const functions = useMemo(
    () => unitFunctions((units.data?.units ?? []).map((u) => u.function)),
    [units.data],
  );
  const list = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return (units.data?.units ?? [])
      .filter((u) => {
        if (!matchesFunction(fns.filter, u.function)) return false;
        if (scopeFilter !== allScopes) {
          const s = unitScopeOf(unitScopes.byUnit, scopes.byId, u.id) ?? defaultScope;
          // A filter on a deleted scope shows Default's units.
          const want =
            scopeFilter === defaultScope || scopes.byId.has(scopeFilter)
              ? scopeFilter
              : defaultScope;
          if (s !== want) return false;
        }
        const text = `${u.call_sign} ${u.name}`.toLowerCase();
        return words.every((w) => text.includes(w));
      })
      .sort((a, b) => unitLabel(a).localeCompare(unitLabel(b), undefined, { numeric: true }));
  }, [units.data, query, fns.filter, scopeFilter, unitScopes.byUnit, scopes.byId]);

  const change = (unit: Unit, scope: string) => {
    setSaving(unit.id);
    setError(null);
    unitScopes
      .set(unit.id, scope === defaultScope ? null : scope)
      .catch((err: unknown) => setError(`${unitLabel(unit)}: ${(err as Error).message}`))
      .finally(() => setSaving(null));
  };

  const actions = (
    <WidgetActionBar label="Unit scope actions">
      <WidgetAction onClick={() => void Promise.all([units.reload(), unitScopes.reload()])}>
        Refresh
      </WidgetAction>
      <FilterToggle
        open={fns.showFilters}
        active={fns.activeFilters}
        onToggle={fns.toggleFilters}
      />
    </WidgetActionBar>
  );

  if (!units.data) {
    return (
      <>
        {actions}
        {units.error === null ? <Spinner compact /> : <Alert severity="error">{units.error}</Alert>}
      </>
    );
  }
  if (!units.data.enabled) {
    return (
      <>
        {actions}
        <EmptyState>No units server is configured.</EmptyState>
      </>
    );
  }

  const scopeChoices = (
    <>
      <option value={defaultScope}>{defaultScopeName}</option>
      {sortedScopes.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </>
  );

  return (
    <>
      {actions}
      {!units.data.connected && (
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
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label htmlFor={`${id}-scope`} className={tableStyles.hidden}>
          Show the units of
        </label>
        <select
          id={`${id}-scope`}
          className={styles.scopeSelect}
          value={scopeFilter}
          onChange={(e) => setScopeFilter(e.target.value)}
        >
          <option value={allScopes}>All scopes</option>
          {scopeChoices}
        </select>
      </div>
      {fns.showFilters && (
        <UnitFunctionFilterSection
          functions={functions}
          filter={fns.filter}
          onChange={fns.setFilter}
        />
      )}
      {list.length === 0 ? (
        <EmptyState>
          {query || fns.activeFilters > 0 || scopeFilter !== allScopes
            ? 'No unit matches.'
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
                <th>Scope</th>
              </tr>
            </thead>
            <tbody>
              {list.map((u) => {
                const label = unitLabel(u);
                return (
                  <tr key={u.id}>
                    <td>
                      {label}
                      {label !== u.name && <span className={tableStyles.meta}> {u.name}</span>}
                    </td>
                    <td>{u.function}</td>
                    <td>{u.status && <FmsBadge code={u.status.code} />}</td>
                    <td>
                      <select
                        aria-label={`Scope of ${label}`}
                        className={styles.scopeSelect}
                        value={scopeOf(u.id) ?? defaultScope}
                        disabled={offline || saving === u.id}
                        onChange={(e) => change(u, e.target.value)}
                      >
                        {scopeChoices}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <FormError error={error} onClose={() => setError(null)} />
    </>
  );
}

export default UnitScopes;
