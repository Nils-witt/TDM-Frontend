import { useCallback } from 'react';
import { unitScopeOf, useUnitScopes } from '@/api/unitScopes';
import { useCatalogs } from '@/data/catalogContext';
import { useSelectedScope } from '@/data/selectedScope';

// The API answers only the units of the session's scope; this guards what
// the cache kept from before a switch.
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
