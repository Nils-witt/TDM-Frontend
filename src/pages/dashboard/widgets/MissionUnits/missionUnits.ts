import { useCallback, useMemo, useState } from 'react';
import {
  isAssigned,
  type MissionUnit,
  missionUnitsApi,
  useActiveMissionUnits,
} from '@/api/missionUnits';
import { useReplica } from '@/api/replica';
import { type Unit, unitLabel, useUnits } from '@/api/units';
import type { MissionData } from '@/data/missionData';
import { useMissions } from '@/data/missionsContext';

// The state of the Units in Mission and Add Unit widgets, apart from how they
// render. A write's answer goes into the replica and the current assignments
// are reloaded, so both widgets show it before the change event arrives.

function useApplyAssignment() {
  const replica = useReplica();
  const { reload } = useActiveMissionUnits();
  return useCallback(
    (mu: MissionUnit) => {
      replica.put('mission_units', mu);
      void reload();
    },
    [replica, reload],
  );
}

export type MissionUnitRow = {
  assignment: MissionUnit;
  // The unit as the units server knows it now; undefined once it is gone or
  // while the units are not loaded.
  unit: Unit | undefined;
};

// The selected mission's assignments: the current ones newest first, then the
// released ones, most recently released first.
export function useMissionUnits({ mission, readOnly, units: assignments }: MissionData) {
  const units = useUnits();
  const apply = useApplyAssignment();
  const [releasing, setReleasing] = useState<string | null>(null);
  const [ownError, setError] = useState<string | null>(null);

  const byId = useMemo(
    () => new Map((units.data?.units ?? []).map((u) => [u.id, u])),
    [units.data],
  );
  const { current, released } = useMemo(() => {
    const rows = assignments.items.map((a) => ({ assignment: a, unit: byId.get(a.unit_id) }));
    return {
      current: rows.filter((r) => isAssigned(r.assignment)),
      released: rows
        .filter((r) => !isAssigned(r.assignment))
        .sort((a, b) =>
          (b.assignment.released_at ?? '').localeCompare(a.assignment.released_at ?? ''),
        ),
    };
  }, [assignments.items, byId]);

  const release = useCallback(
    (mu: MissionUnit) => {
      setReleasing(mu.id);
      setError(null);
      missionUnitsApi
        .release(mu.id)
        .then(apply)
        .catch((err: unknown) => setError((err as Error).message))
        .finally(() => setReleasing(null));
    },
    [apply],
  );

  return {
    mission,
    readOnly,
    loading: assignments.loading,
    current,
    released,
    releasing,
    release,
    error: ownError ?? assignments.error,
    clearError: () => setError(null),
  };
}

export type AssignState =
  | { kind: 'free' }
  | { kind: 'here' }
  // missionName is empty while the mission is not loaded.
  | { kind: 'elsewhere'; missionId: string; missionName: string };

export type AssignableUnit = { unit: Unit; state: AssignState };

const matches = (u: Unit, words: string[]) => {
  const text = `${u.call_sign} ${u.name}`.toLowerCase();
  return words.every((w) => text.includes(w));
};

// Every unit of the units server, matched against the search text, with
// where it is: free, on this mission or on another one. A unit on another
// mission has to be released there first.
export function useAssignUnit({ mission, readOnly, units: assignments }: MissionData) {
  const units = useUnits();
  const active = useActiveMissionUnits();
  const missions = useMissions();
  const apply = useApplyAssignment();
  const [query, setQuery] = useState('');
  const [assigning, setAssigning] = useState<string | null>(null);
  const [ownError, setError] = useState<string | null>(null);

  // This mission's own rows are the freshest: the replica has a write's answer
  // before the current assignments are reloaded.
  const here = useMemo(
    () => new Set(assignments.items.filter(isAssigned).map((a) => a.unit_id)),
    [assignments.items],
  );

  const list = useMemo((): AssignableUnit[] => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return (units.data?.units ?? [])
      .filter((u) => matches(u, words))
      .map((unit) => {
        if (here.has(unit.id)) return { unit, state: { kind: 'here' } };
        const other = active.byUnit.get(unit.id);
        if (other && other.mission !== mission?.id) {
          return {
            unit,
            state: {
              kind: 'elsewhere',
              missionId: other.mission,
              missionName: missions.byId.get(other.mission)?.occurred_event ?? '',
            },
          };
        }
        return { unit, state: { kind: 'free' } };
      });
  }, [units.data, query, here, active.byUnit, missions.byId, mission?.id]);

  const assign = useCallback(
    (unit: Unit) => {
      if (!mission) return;
      setAssigning(unit.id);
      setError(null);
      missionUnitsApi
        .assign(mission.id, unit.id)
        .then(apply)
        .catch((err: unknown) => setError(`${unitLabel(unit)}: ${(err as Error).message}`))
        .finally(() => setAssigning(null));
    },
    [mission, apply],
  );

  return {
    mission,
    readOnly,
    // Undefined until the units are loaded.
    enabled: units.data?.enabled,
    connected: units.data?.connected ?? true,
    loading: units.data === undefined && units.error === null,
    query,
    setQuery,
    list,
    assigning,
    assign,
    error: ownError ?? units.error ?? active.error,
    clearError: () => setError(null),
    reload: () => Promise.all([units.reload(), active.reload()]),
  };
}
