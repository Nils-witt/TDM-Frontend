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
  // When the last linked mission closed; null while one is open.
  closed_at: Timestamp | null;
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
  closed?: boolean;
};

export const patientsPath = '/api/v1/patients';
export const patientPath = (id: string) => `${patientsPath}/${encodeURIComponent(id)}`;
export const patientMissionsPath = (id: string) => `${patientPath(id)}/missions`;

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

// The patient's version for If-Match: its ETag is its updated_at.
const ifMatch = (p: Patient) => ({ 'If-Match': `"${p.updated_at}"` });

export const patientsApi = {
  create: (fields: PatientFields & { missions: string[] }) =>
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
};

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
// last link stays, and the links to a closed mission are frozen.
export function unlinkBlocker(
  p: Patient,
  mission: Pick<Mission, 'status'> | undefined,
): string | null {
  if (p.missions.length + (p.other_missions?.length ?? 0) <= 1) {
    return 'A patient keeps at least one mission.';
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

// Empty text (after trimming) is unknown.
export const blankToNull = (s: string): string | null => (s.trim() === '' ? null : s.trim());
