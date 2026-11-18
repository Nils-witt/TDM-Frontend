import { ApiError, request } from './client';
import type { EntityMeta } from './entity';
import type { Coordinates, MissionStatus } from './missions';
import { patientPath } from './patients';
import { useResource } from './resource';

// Transport requests: an UHS function asks for a patient in its UHS to be
// transported. The API creates an open mission of a mission type offered for
// it (transport_request), at the UHS's address, linked to the patient, and
// logs the request. The UHS needs no mission permissions: it sees the mission
// through the patient (only while the patient is in its UHS, so online only
// like the patients) and fills in its destination.

// The part of the mission the UHS sees, with the mission's field names.
export type TransportMission = EntityMeta & {
  id: string;
  occurred_event: string;
  status: MissionStatus;
  mission_type: string | null;
  mission_type_group: string | null;
  address_street: string;
  address_house_number: string;
  address_city: string;
  address_district: string;
  address_object_name: string;
  address_coordinates: Coordinates | null;
  destination_street: string;
  destination_house_number: string;
  destination_city: string;
  destination_district: string;
  destination_object_name: string;
  destination_coordinates: Coordinates | null;
};

export type TransportRequest = EntityMeta & {
  id: string;
  patient: string;
  uhs: string;
  uhs_name: string;
  mission: TransportMission;
};

export type TransportDestination = Partial<
  Pick<
    TransportMission,
    | 'destination_street'
    | 'destination_house_number'
    | 'destination_city'
    | 'destination_district'
    | 'destination_object_name'
    | 'destination_coordinates'
  >
>;

// Below the patient's path, so the patient events (missions, patients,
// transport_requests) reload it.
export const patientTransportPath = (patientId: string) => `${patientPath(patientId)}/transport`;

// Open until its mission is done or closed; a patient has at most one open.
export const isTransportOpen = (r: TransportRequest) =>
  r.mission.status !== 'done' && r.mission.status !== 'closed';

// null without a request (404), so "none yet" is no error.
async function fetchTransport(path: string): Promise<TransportRequest | null> {
  try {
    return await request<TransportRequest>(path);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

// The patient's newest request (an UHS session: of its UHS); null loads
// nothing.
export const usePatientTransport = (patientId: string | null) =>
  useResource<TransportRequest | null>(
    patientId && patientTransportPath(patientId),
    fetchTransport,
    {
      persist: false,
    },
  );

export const transportsApi = {
  // 409 while the patient is inbound or has an open request; 422 for a type
  // not offered for it.
  request: (patientId: string, missionType: string) =>
    request<TransportRequest>(patientTransportPath(patientId), {
      method: 'POST',
      body: JSON.stringify({ mission_type: missionType }),
    }),
  // Fails with 412 if the mission changed since r was loaded.
  patchDestination: (r: TransportRequest, fields: TransportDestination) =>
    request<TransportRequest>(`/api/v1/missions/${encodeURIComponent(r.mission.id)}/destination`, {
      method: 'PATCH',
      headers: { 'If-Match': `"${r.mission.updated_at}"` },
      body: JSON.stringify(fields),
    }),
};

// Why the patient's transport cannot be requested now, null if it can: only
// an arrived patient, without an open request.
export function transportBlocker(
  // An older API's stay (without arrived_at) counts as arrived.
  patient: { uhs?: { arrived_at?: string | null } | null },
  latest: TransportRequest | null | undefined,
  { canEdit, offline }: { canEdit: boolean; offline: boolean },
): string | null {
  if (offline) return 'Not available offline.';
  if (!canEdit) return 'Needs the permission patients.edit.';
  if (!patient.uhs) return 'The patient is in no UHS.';
  if (patient.uhs.arrived_at === null) return 'Request a transport after the patient has arrived.';
  if (latest === undefined) return 'Loading…';
  if (latest && isTransportOpen(latest)) return 'A transport is already requested.';
  return null;
}
