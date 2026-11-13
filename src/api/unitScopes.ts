import { useCallback, useMemo } from 'react';
import type { MissionScope } from './catalogs';
import { request } from './client';
import type { EntityMeta } from './entity';
import { listFetcher } from './list';
import { useResource, useResourceCache } from './resource';

// The mission scope a unit of the units server (units.ts) belongs to, one at
// most. The API lists no row for a unit in the Global scope, nor for one
// whose scope was deleted.
export type UnitScope = EntityMeta & {
  id: string;
  unit_id: string;
  scope: string;
};

export const unitScopesPath = '/api/v1/unit-scopes';

const fetchUnitScopes = listFetcher<UnitScope>('unit_scopes');

// scope null moves the unit to Global; the API then answers 204.
const putUnitScope = (unitId: string, scope: string | null) =>
  request<UnitScope | undefined>(`${unitScopesPath}/${encodeURIComponent(unitId)}`, {
    method: 'PUT',
    body: JSON.stringify({ scope }),
  });

// The scope ID of the unit, null for Global. A scope the catalog no longer
// has counts as Global, as it does for a tab.
export function unitScopeOf(
  byUnit: ReadonlyMap<string, UnitScope>,
  scopes: ReadonlyMap<string, MissionScope>,
  unitId: string,
): string | null {
  const id = byUnit.get(unitId)?.scope;
  return id && scopes.has(id) ? id : null;
}

// Every unit's scope, by unit ID. set puts the answer into the cache, so the
// writer sees it before the change event arrives.
export function useUnitScopes() {
  const res = useResource<UnitScope[]>(unitScopesPath, fetchUnitScopes);
  const cache = useResourceCache();
  const byUnit = useMemo(() => new Map((res.data ?? []).map((u) => [u.unit_id, u])), [res.data]);
  const set = useCallback(
    async (unitId: string, scope: string | null) => {
      const row = await putUnitScope(unitId, scope);
      const current = (cache.state(unitScopesPath).data as UnitScope[] | undefined) ?? [];
      const rest = current.filter((u) => u.unit_id !== unitId);
      cache.put(unitScopesPath, row ? [row, ...rest] : rest);
    },
    [cache],
  );
  return { ...res, byUnit, set };
}
