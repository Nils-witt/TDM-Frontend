import { request } from './client';
import type { EntityMeta, Timestamp } from './entity';
import { listFetcher } from './list';
import type { Mission } from './missions';
import { useResource } from './resource';

// Patients cared for in missions. Online only: kept out of the offline store
// (persist: false) and the replica, as personal data must not stay on the
// device. Reading needs the permission patients.view, writing patients.edit;
// patients whose missions all closed more than 24 h ago need
// patients.archive.view, else the API leaves them out (404 when asked for).
// A patient is linked to missions, or in an UHS without any (a walk-in);
// a patient in an UHS of the session scope is in that scope too.

export type Patient = EntityMeta & {
  id: string;
  // null while unknown.
  first_name: string | null;
  last_name: string | null;
  // YYYY-MM-DD.
  birth_date: string | null;
  // Free text.
  event: string | null;
  // The linked missions in the session's scope, oldest link first.
  missions: string[];
  // The linked missions outside the session's scope: only their ID and
  // occurred event. Absent from an API older than scopes in sessions.
  other_missions?: { id: string; name: string }[];
  // The current UHS; null outside one, absent from an API older than UHS.
  // in_scope is false for an UHS of another scope (shown by name only).
  uhs?: PatientUhs | null;
  // When the last linked mission closed or the last stay ended; null while
  // a mission is open or the patient is in an UHS.
  closed_at: Timestamp | null;
};

export type PatientUhs = {
  id: string;
  name: string;
  active: boolean;
  // When the stay began (the patient was assigned there).
  since: Timestamp;
  // When the UHS marked the patient as arrived; null while it is inbound
  // (assigned from a mission, on its way). A walk-in arrives with its stay.
  // Absent from an API older than arrivals: counted as arrived.
  arrived_at?: Timestamp | null;
  in_scope: boolean;
};

// A stay of a patient in an UHS; released_at null for the current one.
export type PatientStay = {
  id: string;
  uhs: string;
  uhs_name: string;
  assigned_at: Timestamp;
  released_at: Timestamp | null;
  // Why the patient was removed; null for the current stay or one ended by
  // a move to another UHS or a checkout.
  release_reason: string | null;
  // Who checked the patient out: it was there and left. Null for a stay that
  // is current, removed or ended by a move; absent from an older API.
  checked_out_by?: string | null;
  // When the patient arrived and who marked it; null while inbound, or if it
  // was released before it arrived. Absent from an API older than arrivals.
  arrived_at?: Timestamp | null;
  arrived_by?: string | null;
  created_by: string;
};

// The API's limit on the names and the event.
export const patientTextMax = 200;

// The API's limit on the reason of deleting, unlinking or removing from an
// UHS.
export const removalReasonMax = 500;

// The reason dialog of each way a patient is removed (RevokeDialog,
// RevokeDialogMUI). The API keeps the row and the reason.
export const patientRemovalTexts = {
  delete: {
    title: 'Delete patient',
    note: 'The patient and its links are kept with the reason, but hidden everywhere. This cannot be undone.',
    submitLabel: 'Delete',
    placeholder: 'Why is the patient deleted?',
    maxLength: removalReasonMax,
  },
  unlink: {
    title: 'Unlink patient',
    note: 'The link is kept with the reason.',
    submitLabel: 'Unlink',
    placeholder: 'Why is the patient unlinked from this mission?',
    maxLength: removalReasonMax,
  },
  release: {
    title: 'Remove from UHS',
    note: 'The stay ends and keeps the reason.',
    submitLabel: 'Remove',
    placeholder: 'Why does the patient leave the UHS?',
    maxLength: removalReasonMax,
  },
} as const;

export type PatientFields = {
  first_name: string | null;
  last_name: string | null;
  birth_date: string | null;
  event: string | null;
};

// scope: a scope ID, null for Default, undefined for every scope (Global).
// closed also lists the patients whose missions are all closed.
export type PatientFilter = {
  mission?: string;
  scope?: string | null;
  q?: string;
  event?: string;
  // The patients currently in this UHS.
  uhs?: string;
  closed?: boolean;
};

export const patientsPath = '/api/v1/patients';
export const patientPath = (id: string) => `${patientsPath}/${encodeURIComponent(id)}`;
export const patientMissionsPath = (id: string) => `${patientPath(id)}/missions`;
export const patientUhsPath = (id: string) => `${patientPath(id)}/uhs`;
export const patientStaysPath = (id: string) => `${patientPath(id)}/uhs-history`;

// The list path of filter; the same filter gives the same path, so widgets
// showing it share one request.
export function patientsListPath(filter: PatientFilter): string {
  const params = new URLSearchParams();
  if (filter.mission) params.set('mission', filter.mission);
  if (filter.scope !== undefined) params.set('scope', filter.scope ?? 'global');
  const q = filter.q?.trim();
  if (q) params.set('q', q);
  const event = filter.event?.trim();
  if (event) params.set('event', event);
  if (filter.uhs) params.set('uhs', filter.uhs);
  if (filter.closed) params.set('closed', 'true');
  const query = params.toString();
  return query ? `${patientsPath}?${query}` : patientsPath;
}

const keepOut = { persist: false };
const fetchPatients = listFetcher<Patient>('patients');

// null loads nothing, e.g. without the permission or offline.
export const usePatients = (filter: PatientFilter | null) =>
  useResource<Patient[]>(filter && patientsListPath(filter), fetchPatients, keepOut);

// One patient; null loads nothing. 404 once deleted or hidden.
export const usePatient = (id: string | null) =>
  useResource<Patient>(id && patientPath(id), undefined, keepOut);

const fetchStays = listFetcher<PatientStay>('stays');

// The patient's UHS stays, newest first; null loads nothing.
export const usePatientStays = (id: string | null) =>
  useResource<PatientStay[]>(id && patientStaysPath(id), fetchStays, keepOut);

// The patient's version for If-Match: its ETag is its updated_at.
const ifMatch = (p: Patient) => ({ 'If-Match': `"${p.updated_at}"` });

export const patientsApi = {
  // With uhs and no missions: a walk-in in that UHS.
  create: (fields: PatientFields & { missions: string[]; uhs?: string }) =>
    request<Patient>(patientsPath, { method: 'POST', body: JSON.stringify(fields) }),
  // Fails with 412 if someone changed the patient since p was loaded.
  patch: (p: Patient, fields: Partial<PatientFields>) =>
    request<Patient>(patientPath(p.id), {
      method: 'PATCH',
      headers: ifMatch(p),
      body: JSON.stringify(fields),
    }),
  // Patients, links and stays are never removed: the API soft-deletes them
  // (or ends the stay) and keeps the reason, which it requires.
  remove: (p: Patient, reason: string) =>
    request<void>(patientPath(p.id), {
      method: 'DELETE',
      headers: ifMatch(p),
      body: JSON.stringify({ reason }),
    }),
  link: (id: string, mission: string) =>
    request<Patient>(patientMissionsPath(id), {
      method: 'POST',
      body: JSON.stringify({ mission }),
    }),
  unlink: (id: string, mission: string, reason: string) =>
    request<Patient>(`${patientMissionsPath(id)}/${encodeURIComponent(mission)}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    }),
  // Moves the patient into the UHS, ending its current stay.
  assignUhs: (id: string, uhs: string) =>
    request<Patient>(patientUhsPath(id), { method: 'PUT', body: JSON.stringify({ uhs }) }),
  // Marks the patient as arrived in its current UHS (a no-op once it has).
  arriveUhs: (id: string) => request<Patient>(`${patientUhsPath(id)}/arrival`, { method: 'POST' }),
  // For a patient assigned in error or that never came; the reason is kept.
  releaseUhs: (id: string, reason: string) =>
    request<Patient>(patientUhsPath(id), { method: 'DELETE', body: JSON.stringify({ reason }) }),
  // Ends the stay of a patient that was there and leaves now (409 while
  // inbound).
  checkoutUhs: (id: string) =>
    request<Patient>(`${patientUhsPath(id)}/checkout`, { method: 'POST' }),
};

// Whether the patient is on its way to its UHS: assigned, not yet arrived.
export const isInbound = (p: Patient): boolean => p.uhs?.arrived_at === null;

// When the patient arrived in its current UHS: arrived_at, or for an older
// API the start of the stay. Null while inbound or outside an UHS.
export const uhsArrival = (p: Patient): Timestamp | null =>
  p.uhs ? (p.uhs.arrived_at === undefined ? p.uhs.since : p.uhs.arrived_at) : null;

// When the patient arrived in the stay's UHS and who marked it (formatted
// with format); Inbound while on its way, Not arrived for a stay that ended
// first. An older API's stays count as arrived when they began.
export function stayArrivalLabel(s: PatientStay, format: (ts: Timestamp) => string): string {
  if (s.arrived_at === undefined) return format(s.assigned_at);
  if (s.arrived_at === null) return s.released_at ? 'Not arrived' : 'Inbound';
  return `${format(s.arrived_at)}${s.arrived_by ? ` (${s.arrived_by})` : ''}`;
}

// How the stay ended: Checked out (and by whom), the removal's reason, or
// empty for the current stay or one ended by a move.
export function stayEndLabel(s: PatientStay): string {
  if (s.checked_out_by) return `Checked out (${s.checked_out_by})`;
  return s.release_reason ? `Removed: ${s.release_reason}` : '';
}

// A patient without missions, cared for only in an UHS.
export const isWalkIn = (p: Patient) => p.missions.length + (p.other_missions?.length ?? 0) === 0;

// "Doe, Jane", "Doe" or "Jane"; Unknown without either name.
export function formatPatientName(p: Pick<Patient, 'first_name' | 'last_name'>): string {
  const names = [p.last_name, p.first_name].filter((n): n is string => !!n);
  return names.length > 0 ? names.join(', ') : 'Unknown';
}

// Whole years at today (a YYYY-MM-DD date in local time); null without a
// birth date.
export function patientAge(birthDate: string | null, today: string): number | null {
  if (!birthDate) return null;
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  if (!by || !bm || !bd || !ty || !tm || !td) return null;
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

// Today as YYYY-MM-DD in local time, the upper bound of a birth date.
export function localDate(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// Why the patient cannot be unlinked from the mission, null if it can: the
// last link stays unless the patient is in an UHS, and the links to a
// closed mission are frozen.
export function unlinkBlocker(
  p: Patient,
  mission: Pick<Mission, 'status'> | undefined,
): string | null {
  if (p.missions.length + (p.other_missions?.length ?? 0) <= 1 && !p.uhs) {
    return 'A patient outside an UHS keeps at least one mission.';
  }
  if (mission?.status === 'closed') return 'The mission is closed: its patients are frozen.';
  return null;
}

// Why the patient cannot be linked to the mission, null if it can.
export function linkBlocker(p: Patient, mission: Pick<Mission, 'id' | 'status'>): string | null {
  if (p.missions.includes(mission.id)) return 'Already linked to this mission.';
  if (mission.status === 'closed') return 'The mission is closed: its patients are frozen.';
  return null;
}

// How long after closing a patient stays current (the API's
// ClosedMissionRetention); later it is historic and read-only.
export const patientRetentionMs = 24 * 60 * 60 * 1000;

export const isHistoricPatient = (p: Pick<Patient, 'closed_at'>, now: number) =>
  p.closed_at !== null && Date.parse(p.closed_at) < now - patientRetentionMs;

export type UhsWriteContext = {
  canEdit: boolean;
  offline: boolean;
  now: number;
  // A session of an UHS function, which may only remove its patients.
  uhsSession?: boolean;
};

// Why the patient cannot be moved into target (assign) or out of its UHS
// (release), null if it can. Without target, whether it can be assigned at
// all.
export function uhsBlocker(
  p: Patient,
  ctx: UhsWriteContext,
  action: 'assign' | 'release',
  target?: { id: string; active: boolean },
): string | null {
  if (ctx.offline) return 'Not available offline.';
  if (!ctx.canEdit) return 'Needs the permission patients.edit.';
  if (isHistoricPatient(p, ctx.now))
    return 'The patient closed more than 24 hours ago: it is read-only.';
  if (action === 'release') return p.uhs ? null : 'The patient is in no UHS.';
  if (ctx.uhsSession) return 'An UHS function cannot move patients to another UHS.';
  if (target && !target.active) return 'The UHS is inactive.';
  if (target && p.uhs?.id === target.id) return 'The patient is already in this UHS.';
  return null;
}

// Why the inbound patient cannot be marked as arrived, null if it can. Also
// for UHS sessions, whose staff receive it.
export function arriveBlocker(p: Patient, ctx: UhsWriteContext): string | null {
  if (ctx.offline) return 'Not available offline.';
  if (!ctx.canEdit) return 'Needs the permission patients.edit.';
  if (!p.uhs) return 'The patient is in no UHS.';
  if (!isInbound(p)) return 'The patient has already arrived.';
  return null;
}

// Why the patient cannot be checked out of its UHS, null if it can: only one
// that arrived (or walked in) leaves by a checkout; one that never came is
// removed instead. Also for UHS sessions. A patient in an UHS is never
// historic, so the time does not matter.
export function checkoutBlocker(
  p: Patient,
  ctx: Pick<UhsWriteContext, 'canEdit' | 'offline'>,
): string | null {
  if (ctx.offline) return 'Not available offline.';
  if (!ctx.canEdit) return 'Needs the permission patients.edit.';
  if (!p.uhs) return 'The patient is in no UHS.';
  if (isInbound(p)) return 'The patient has not arrived: remove it instead.';
  return null;
}

// Empty text (after trimming) is unknown.
export const blankToNull = (s: string): string | null => (s.trim() === '' ? null : s.trim());
