import { useResource } from './resource';

// The API follows the units server (go-unit-mangement) over its event stream
// and announces changes as the event type `units`, so these are reloaded
// without polling.

export type UnitStatus = { code: number; at: string };

export type Unit = {
  id: string;
  name: string;
  // The tactical name as spoken; empty when the unit has none.
  call_sign: string;
  status: UnitStatus | null;
  updated_at: string;
};

// connected: the API's stream from the units server is up; while it is not,
// what is listed may be out of date.
export type UnitList = { enabled: boolean; connected: boolean; units: Unit[] };

// from is null when unknown, as for the statuses the API saw first after it
// started; to is null when the status was cleared.
export type UnitStatusChange = {
  unit_id: string;
  name: string;
  call_sign: string;
  from: number | null;
  to: number | null;
  at: string;
  received_at: string;
};

export type UnitStatusChangeList = {
  enabled: boolean;
  connected: boolean;
  changes: UnitStatusChange[];
};

export const unitsPath = '/api/v1/units';

// The API keeps at most this many.
export const maxUnitStatusChanges = 500;

export const unitStatusChangesPath = (limit: number) =>
  `${unitsPath}/status-changes?limit=${limit}`;

export function useUnits() {
  return useResource<UnitList>(unitsPath);
}

export function useUnitStatusChanges(limit: number) {
  return useResource<UnitStatusChangeList>(unitStatusChangesPath(limit));
}

export const unitLabel = (u: { call_sign: string; name: string }) => u.call_sign || u.name;

// The FMS statuses, as the units server labels them.
export const fmsStatusLabels: Record<number, string> = {
  0: 'Urgent request to talk',
  1: 'Available on radio',
  2: 'Available at station',
  3: 'Assignment accepted',
  4: 'On scene',
  5: 'Request to talk',
  6: 'Not available',
  7: 'Patient loaded',
  8: 'At destination',
  9: 'Foreign registration',
};

export type FmsTone = 'available' | 'busy' | 'request' | 'unavailable';

// Available (1, 2), on an assignment (3, 4, 7, 8), asking to talk (0, 5),
// not available (6); 9 counts as busy.
export function fmsTone(code: number): FmsTone {
  if (code === 1 || code === 2) return 'available';
  if (code === 0 || code === 5) return 'request';
  if (code === 6) return 'unavailable';
  return 'busy';
}
