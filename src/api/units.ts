import { request } from './client';
import { useResource } from './resource';

// The API follows the units server (go-unit-mangement) over its event stream
// and announces changes as the event type `units`, so these are reloaded
// without polling.

export type UnitStatus = { code: number; at: string };

// The FMS statuses the units server records as requests instead of as the
// unit's status, which stays as it was: 0 (urgent request to talk), 5
// (request to talk) and 9 (foreign registration). Only the latest report per
// unit and code is kept; a new one replaces it, pending again.
export const requestCodes = [0, 5, 9] as const;

// acknowledged_at and acknowledged_by (the units server's account, for
// acknowledgements made here the API's) are null while it is pending.
export type UnitStatusRequest = {
  code: number;
  at: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
};

export type Unit = {
  id: string;
  name: string;
  // The tactical name as spoken; empty when the unit has none.
  call_sign: string;
  // The function code of the tactical name, e.g. "83" in "12/83-1"; empty
  // when the unit has none.
  function: string;
  status: UnitStatus | null;
  // One per request code at most, by code. Absent from an older API's (or a
  // stored older) answer.
  requests?: UnitStatusRequest[];
  updated_at: string;
};

// connected: the API's stream from the units server is up; while it is not,
// what is listed may be out of date.
export type UnitList = { enabled: boolean; connected: boolean; units: Unit[] };

// from is null when unknown, as for the statuses the API saw first after it
// started; to is null when the status was cleared. request marks a report of
// a request code (to), after which the unit's status is still from.
export type UnitStatusChange = {
  unit_id: string;
  name: string;
  call_sign: string;
  from: number | null;
  to: number | null;
  at: string;
  received_at: string;
  request?: boolean;
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

export const isPendingRequest = (r: UnitStatusRequest) => r.acknowledged_at === null;

// The change arrives through the units server's event stream (as `units`).
export const acknowledgeUnitRequest = (unitId: string, code: number) =>
  request<void>(`${unitsPath}/${encodeURIComponent(unitId)}/requests/${code}/acknowledge`, {
    method: 'POST',
  });

export function useUnitStatusChanges(limit: number) {
  return useResource<UnitStatusChangeList>(unitStatusChangesPath(limit));
}

// The distinct, non-empty function codes, in natural order ("2" before "10").
export function unitFunctions(codes: Iterable<string>): string[] {
  const set = new Set<string>();
  for (const c of codes) if (c) set.add(c);
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
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
