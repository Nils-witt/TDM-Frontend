import { request } from './client';
import type { EntityMeta } from './entity';
import { listFetcher } from './list';

// A mission cannot return to draft once it left it. Closed is final: the
// mission, its log and its tasks can no longer be changed.
export type MissionStatus = 'draft' | 'open' | 'in-progress' | 'done' | 'closed';

// In lifecycle order. chip is the class of its StatusChip.
export const missionStatuses: readonly { value: MissionStatus; label: string; chip: string }[] = [
  { value: 'draft', label: 'Draft', chip: 'outlined' },
  { value: 'open', label: 'Open', chip: '' },
  { value: 'in-progress', label: 'In progress', chip: 'warning' },
  { value: 'done', label: 'Done', chip: 'success' },
  { value: 'closed', label: 'Closed', chip: 'disabled' },
];

// WGS 84.
export type Coordinates = { lat: number; lon: number };

export type Mission = EntityMeta & {
  id: string;
  occurred_event: string;
  status: MissionStatus;
  // Sorted, without duplicates.
  tags: string[];
  mission_type: string | null;
  // Follows from mission_type; read-only.
  mission_type_group: string | null;
  address_street: string;
  address_house_number: string;
  address_city: string;
  address_district: string;
  // A building or site name.
  address_object_name: string;
  address_coordinates: Coordinates | null;
  // Who called the mission in.
  callee: string;
  callee_phone: string;
};

export const missionsPath = '/api/v1/missions';

export const fetchMissions = listFetcher<Mission>('missions');

// The object name if set, else the street with its house number.
export function shortLocation(m: Mission): string {
  return (
    m.address_object_name || [m.address_street, m.address_house_number].filter(Boolean).join(' ')
  );
}

export const missionPath = (id: string) => `${missionsPath}/${encodeURIComponent(id)}`;

// The fields a form edits; tags are left as they are.
export type MissionFields = Partial<
  Pick<
    Mission,
    | 'occurred_event'
    | 'status'
    | 'mission_type'
    | 'address_street'
    | 'address_house_number'
    | 'address_city'
    | 'address_district'
    | 'address_object_name'
    | 'address_coordinates'
    | 'callee'
    | 'callee_phone'
  >
>;

// New missions start as drafts.
export const createMission = (fields: MissionFields & { occurred_event: string }) =>
  request<Mission>(missionsPath, { method: 'POST', body: JSON.stringify(fields) });

export const patchMission = (id: string, fields: MissionFields) =>
  request<Mission>(missionPath(id), { method: 'PATCH', body: JSON.stringify(fields) });
