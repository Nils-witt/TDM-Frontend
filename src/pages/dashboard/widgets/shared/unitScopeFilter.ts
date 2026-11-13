import { useCallback } from 'react';
import { unitScopeOf, useUnitScopes } from '@/api/unitScopes';
import { useCatalogs } from '@/data/catalogContext';
import { useSelectedScope } from '@/data/selectedScope';
import type { WidgetOption } from '../widgetOptions';

// The unit widgets' (Add Unit, Unit Status, Unit Requests) counterpart of the
// mission widgets' option: only the units of the scope selected in the menu
// bar (useSelectedScope), Default for the units in none, every unit in Global.
export const unitScopeOption: WidgetOption = {
  key: 'currentScopeOnly',
  label: 'Only the current scope',
  type: 'boolean',
  default: true,
};

// Whether a unit (by ID) is shown; every unit when enabled is false. Until
// the unit scopes are loaded every unit counts as Default.
export function useUnitScopeMatch(enabled: boolean): (unitId: string) => boolean {
  const { byUnit } = useUnitScopes();
  const scopes = useCatalogs().scopes.byId;
  const { matches } = useSelectedScope();
  return useCallback(
    (unitId: string) => !enabled || matches(unitScopeOf(byUnit, scopes, unitId)),
    [enabled, byUnit, scopes, matches],
  );
}
