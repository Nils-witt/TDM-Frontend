import { useCallback, useMemo, useState } from 'react';
import { useOffline } from '@/api/connectivity';
import {
  acknowledgeUnitRequest,
  isPendingRequest,
  type Unit,
  type UnitStatusRequest,
  unitFunctions,
  unitLabel,
  useUnits,
} from '@/api/units';
import { matchesFunction } from '../shared/unitFunctionFilter';
import { useUnitScopeMatch } from '../shared/unitScopeFilter';

// The units' FMS 0, 5 and 9 requests, for the Unit Requests widget and the
// menu bar's indicator. They come with the units (useUnits()), so the event
// stream keeps them current; an acknowledgement reloads the units too, so the
// writer sees it before the event arrives.

export type UnitRequestRow = { unit: Unit; request: UnitStatusRequest };

export const unitRequestKey = (r: UnitRequestRow) => `${r.unit.id}/${r.request.code}`;

const none: ReadonlySet<string> = new Set();

// The requests of units with a function in fns (empty = all) and, with
// currentScopeOnly, in the tab's scope: the pending ones newest reported
// first, then the acknowledged ones, most recently acknowledged first.
export function useUnitRequests(fns: ReadonlySet<string> = none, currentScopeOnly = true) {
  const units = useUnits();
  const inScope = useUnitScopeMatch(currentScopeOnly);
  const offline = useOffline();
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const [ownError, setError] = useState<string | null>(null);

  const all = useMemo(
    () =>
      (units.data?.units ?? []).flatMap((unit) =>
        (unit.requests ?? []).map((request): UnitRequestRow => ({ unit, request })),
      ),
    [units.data],
  );
  const functions = useMemo(
    () => unitFunctions((units.data?.units ?? []).map((u) => u.function)),
    [units.data],
  );
  const { pending, acknowledged } = useMemo(() => {
    const rows = all.filter((r) => inScope(r.unit.id) && matchesFunction(fns, r.unit.function));
    return {
      pending: rows
        .filter((r) => isPendingRequest(r.request))
        .sort((a, b) => b.request.at.localeCompare(a.request.at)),
      acknowledged: rows
        .filter((r) => !isPendingRequest(r.request))
        .sort((a, b) =>
          (b.request.acknowledged_at ?? '').localeCompare(a.request.acknowledged_at ?? ''),
        ),
    };
  }, [all, fns, inScope]);

  const { reload } = units;
  // Resolves to whether it succeeded; a failure is shown as error.
  const acknowledge = useCallback(
    (row: UnitRequestRow): Promise<boolean> => {
      setAcknowledging(unitRequestKey(row));
      setError(null);
      return acknowledgeUnitRequest(row.unit.id, row.request.code)
        .then(() => {
          void reload();
          return true;
        })
        .catch((err: unknown) => {
          setError(`${unitLabel(row.unit)}: ${(err as Error).message}`);
          return false;
        })
        .finally(() => setAcknowledging(null));
    },
    [reload],
  );

  return {
    // Undefined until the units are loaded.
    enabled: units.data?.enabled,
    connected: units.data?.connected ?? true,
    loading: units.data === undefined && units.error === null,
    // Acknowledging needs the API and its connection to the units server.
    canAcknowledge: !offline && (units.data?.connected ?? false),
    pending,
    acknowledged,
    functions,
    acknowledging,
    acknowledge,
    error: ownError ?? units.error,
    clearError: () => setError(null),
    reload,
  };
}
