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
  // The mission scope's ID; null is the implicit Default scope. Rows
  // replicated before the API had it lack it.
  scope?: string | null;
};

export const missionsPath = '/api/v1/missions';

export const fetchMissions = listFetcher<Mission>('missions');

// The query parameters of GET /api/v1/missions/search. Text ones match
// case-insensitively as substrings; created_from (inclusive) and created_to
// (exclusive) are RFC 3339 timestamps. unit matches the name, call sign or ID
// of any unit ever assigned, released ones included. scope is a mission
// scope's ID, or 'global' for the missions without one. Unlike the mission
// list, it finds missions closed any time ago. Pages are numbered from 1.
export type MissionSearch = Partial<
  Record<
    | 'q'
    | 'event'
    | 'status'
    | 'type_group'
    | 'type'
    | 'street'
    | 'city'
    | 'district'
    | 'object'
    | 'callee'
    | 'tag'
    | 'unit'
    | 'scope'
    | 'created_from'
    | 'created_to',
    string
  >
> & {
  sort?: MissionSortKey;
  order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
};

// Text keys compare case-insensitively; equal keys are ordered newest first.
export type MissionSortKey = 'created' | 'event' | 'type' | 'location' | 'city' | 'status';

// total counts the matches on all pages.
export type MissionSearchPage = {
  missions: Mission[];
  total: number;
  page: number;
  page_size: number;
};

// Empty parameters are left out, so equal searches share one cached path.
export function missionSearchPath(search: MissionSearch): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search).sort(([a], [b]) => a.localeCompare(b))) {
    const v = String(value ?? '').trim();
    if (v) params.set(key, v);
  }
  return `${missionsPath}/search?${params}`;
}

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

// New missions start as drafts; the API rejects a status here, so another one
// is set with a PATCH afterwards. scope is the selected one (useSelectedScope).
export const createMission = (
  fields: Omit<MissionFields, 'status'> & { occurred_event: string; scope: string | null },
) => request<Mission>(missionsPath, { method: 'POST', body: JSON.stringify(fields) });

export const patchMission = (id: string, fields: MissionFields) =>
  request<Mission>(missionPath(id), { method: 'PATCH', body: JSON.stringify(fields) });
