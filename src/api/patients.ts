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
  since: Timestamp;
  in_scope: boolean;
};

// A stay of a patient in an UHS; released_at null for the current one.
export type PatientStay = {
  id: string;
  uhs: string;
  uhs_name: string;
  assigned_at: Timestamp;
  released_at: Timestamp | null;
  created_by: string;
};

// The API's limit on the names and the event.
export const patientTextMax = 200;

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
  remove: (p: Patient) =>
    request<void>(patientPath(p.id), { method: 'DELETE', headers: ifMatch(p) }),
  link: (id: string, mission: string) =>
    request<Patient>(patientMissionsPath(id), {
      method: 'POST',
      body: JSON.stringify({ mission }),
    }),
  unlink: (id: string, mission: string) =>
    request<Patient>(`${patientMissionsPath(id)}/${encodeURIComponent(mission)}`, {
      method: 'DELETE',
    }),
  // Moves the patient into the UHS, ending its current stay.
  assignUhs: (id: string, uhs: string) =>
    request<Patient>(patientUhsPath(id), { method: 'PUT', body: JSON.stringify({ uhs }) }),
  releaseUhs: (id: string) => request<Patient>(patientUhsPath(id), { method: 'DELETE' }),
};

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

// Empty text (after trimming) is unknown.
export const blankToNull = (s: string): string | null => (s.trim() === '' ? null : s.trim());
