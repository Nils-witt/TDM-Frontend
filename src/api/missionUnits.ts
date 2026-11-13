import { useMemo } from 'react';
import { request } from './client';
import type { EntityMeta, Timestamp } from './entity';
import { listFetcher } from './list';
import { useResource } from './resource';

// A unit of the units server (units.ts) assigned to a mission. A unit is on
// at most one mission at a time: the API answers 409 while it is on one,
// this or another. Releasing keeps the assignment as history; closing a
// mission releases its units.
export type MissionUnit = EntityMeta & {
  id: string;
  mission: string;
  unit_id: string;
  // As the unit was named when assigned, for when the units server no longer
  // knows it.
  unit_name: string;
  unit_call_sign: string;
  unit_function: string;
  released_at: Timestamp | null;
  // Empty while assigned.
  released_by: string;
};

export const missionUnitsPath = '/api/v1/mission-units';

// Every current assignment, of all missions: which mission a unit is on.
export const activeMissionUnitsPath = `${missionUnitsPath}?active=true`;

export const fetchMissionUnits = listFetcher<MissionUnit>('mission_units');

export const missionUnitsApi = {
  assign: (missionId: string, unitId: string) =>
    request<MissionUnit>(missionUnitsPath, {
      method: 'POST',
      body: JSON.stringify({ mission: missionId, unit_id: unitId }),
    }),
  release: (id: string) =>
    request<MissionUnit>(`${missionUnitsPath}/${encodeURIComponent(id)}/release`, {
      method: 'POST',
    }),
};

export const isAssigned = (u: MissionUnit) => u.released_at === null;

export const missionUnitLabel = (u: MissionUnit) => u.unit_call_sign || u.unit_name || u.unit_id;

// The current assignment of each unit, by unit ID.
export function useActiveMissionUnits() {
  const res = useResource<MissionUnit[]>(activeMissionUnitsPath, fetchMissionUnits);
  const byUnit = useMemo(() => new Map((res.data ?? []).map((u) => [u.unit_id, u])), [res.data]);
  return { ...res, byUnit };
}
