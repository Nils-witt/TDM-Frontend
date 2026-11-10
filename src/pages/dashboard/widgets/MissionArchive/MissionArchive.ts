import { useMemo, useState } from 'react';
import type { MissionType, MissionTypeGroup } from '@/api/catalogs';
import type { Mission } from '@/api/missions';
import { useCatalogs } from '@/data/catalogContext';
import { useMissions } from '@/data/missionsContext';
import { useDashboard } from '@/pages/dashboard/dashboardContext';

// Text fields match case-insensitively as substrings; '' matches anything.
// createdFrom and createdTo are dates (YYYY-MM-DD) in local time, both
// inclusive.
export type ArchiveFilter = {
  text: string;
  event: string;
  status: string;
  typeGroup: string;
  type: string;
  street: string;
  city: string;
  district: string;
  objectName: string;
  callee: string;
  tag: string;
  createdFrom: string;
  createdTo: string;
};

export const emptyFilter: ArchiveFilter = {
  text: '',
  event: '',
  status: '',
  typeGroup: '',
  type: '',
  street: '',
  city: '',
  district: '',
  objectName: '',
  callee: '',
  tag: '',
  createdFrom: '',
  createdTo: '',
};

export const isEmptyFilter = (f: ArchiveFilter) =>
  (Object.keys(f) as (keyof ArchiveFilter)[]).every((k) => f[k].trim() === '');

export type SortKey = 'created' | 'event' | 'type' | 'location' | 'city' | 'status';
export type Sort = { key: SortKey; descending: boolean };

type TypeCatalogs = {
  types: ReadonlyMap<string, MissionType>;
  groups: ReadonlyMap<string, MissionTypeGroup>;
};

export function typeName(m: Mission, c: TypeCatalogs): string {
  const type = m.mission_type === null ? undefined : c.types.get(m.mission_type);
  if (!type) return '';
  const group = c.groups.get(type.group_id);
  return group ? `${group.name} / ${type.name}` : type.name;
}

export function locationText(m: Mission): string {
  const street = [m.address_street, m.address_house_number].filter(Boolean).join(' ');
  return [m.address_object_name, street].filter(Boolean).join(', ');
}

const fold = (s: string) => s.toLocaleLowerCase();
const contains = (value: string, needle: string) => needle === '' || fold(value).includes(needle);

// The start of the local day of a YYYY-MM-DD date, plus days.
function dayStart(date: string, days = 0): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d + days).getTime();
}

function matcher(f: ArchiveFilter, c: TypeCatalogs): (m: Mission) => boolean {
  const n = (s: string) => fold(s.trim());
  const text = n(f.text);
  const event = n(f.event);
  const street = n(f.street);
  const city = n(f.city);
  const district = n(f.district);
  const objectName = n(f.objectName);
  const callee = n(f.callee);
  const tag = n(f.tag);
  const from = f.createdFrom === '' ? -Infinity : dayStart(f.createdFrom);
  const to = f.createdTo === '' ? Infinity : dayStart(f.createdTo, 1);

  return (m) => {
    if (f.status !== '' && m.status !== f.status) return false;
    if (f.type !== '' && m.mission_type !== f.type) return false;
    if (f.typeGroup !== '') {
      const type = m.mission_type === null ? undefined : c.types.get(m.mission_type);
      if (type?.group_id !== f.typeGroup) return false;
    }
    if (!contains(m.occurred_event, event)) return false;
    if (!contains(m.address_street, street)) return false;
    if (!contains(m.address_city, city)) return false;
    if (!contains(m.address_district, district)) return false;
    if (!contains(m.address_object_name, objectName)) return false;
    if (!contains(`${m.callee} ${m.callee_phone}`, callee)) return false;
    if (tag !== '' && !m.tags.some((t) => fold(t).includes(tag))) return false;
    const created = Date.parse(m.created_at);
    if (created < from || created >= to) return false;
    if (text !== '') {
      const all = [
        m.id,
        m.occurred_event,
        typeName(m, c),
        m.address_street,
        m.address_house_number,
        m.address_city,
        m.address_district,
        m.address_object_name,
        m.callee,
        m.callee_phone,
        ...m.tags,
      ].join('\n');
      if (!fold(all).includes(text)) return false;
    }
    return true;
  };
}

const statusOrder = ['draft', 'open', 'in-progress', 'done', 'closed'];

function comparator(sort: Sort, c: TypeCatalogs): (a: Mission, b: Mission) => number {
  const key: (m: Mission) => string | number = {
    created: (m: Mission) => Date.parse(m.created_at),
    event: (m: Mission) => m.occurred_event,
    type: (m: Mission) => typeName(m, c),
    location: locationText,
    city: (m: Mission) => m.address_city,
    status: (m: Mission) => statusOrder.indexOf(m.status),
  }[sort.key];
  const dir = sort.descending ? -1 : 1;
  return (a, b) => {
    const x = key(a);
    const y = key(b);
    const r =
      typeof x === 'number' && typeof y === 'number'
        ? x - y
        : String(x).localeCompare(String(y), undefined, { numeric: true });
    // Newest first among equal keys.
    return r !== 0 ? r * dir : Date.parse(b.created_at) - Date.parse(a.created_at);
  };
}

// Searches the loaded missions (every status) in the browser, so results
// follow live changes without another request.
export function useMissionArchive(initialStatus: string) {
  const missions = useMissions();
  const { missionTypes, missionTypeGroups } = useCatalogs();
  const [filter, setFilter] = useState<ArchiveFilter>({ ...emptyFilter, status: initialStatus });
  const [sort, setSort] = useState<Sort>({ key: 'created', descending: true });
  const { selectedId, update } = useDashboard();

  const catalogs = useMemo(
    () => ({ types: missionTypes.byId, groups: missionTypeGroups.byId }),
    [missionTypes.byId, missionTypeGroups.byId],
  );
  const results = useMemo(
    () => missions.items.filter(matcher(filter, catalogs)).sort(comparator(sort, catalogs)),
    [missions.items, filter, sort, catalogs],
  );

  // A second click on the sorted column reverses it; dates start newest first.
  const sortBy = (key: SortKey) =>
    setSort((s) =>
      s.key === key ? { key, descending: !s.descending } : { key, descending: key === 'created' },
    );

  return {
    filter,
    setFilter,
    sort,
    sortBy,
    results,
    total: missions.items.length,
    loading: missions.loading,
    error: missions.error,
    catalogs,
    selectedId,
    select: (id: string) => update({ selectedId: id }),
  };
}
