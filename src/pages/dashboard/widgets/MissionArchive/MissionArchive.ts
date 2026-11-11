import { useEffect, useMemo, useState } from 'react';
import type { MissionType, MissionTypeGroup } from '@/api/catalogs';
import { useOffline } from '@/api/connectivity';
import {
  type Mission,
  type MissionSearchPage,
  type MissionSortKey,
  missionSearchPath,
} from '@/api/missions';
import { useResource } from '@/api/resource';
import { useCatalogs } from '@/data/catalogContext';
import { useMissions } from '@/data/missionsContext';

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

export type SortKey = MissionSortKey;
export type Sort = { key: SortKey; descending: boolean };

export const sortColumns: { key: SortKey; label: string }[] = [
  { key: 'created', label: 'Created' },
  { key: 'event', label: 'Event' },
  { key: 'type', label: 'Type' },
  { key: 'location', label: 'Location' },
  { key: 'city', label: 'City' },
  { key: 'status', label: 'Status' },
];

export const defaultSort: Sort = { key: 'created', descending: true };

// What the archive shows; a caller may keep it elsewhere (the responsive UI
// keeps it in the URL, so Back restores a search).
export type ArchiveQuery = { filter: ArchiveFilter; sort: Sort; page: number };
// correction marks a change the user did not make (the page past the end), which
// a URL keeps out of the history.
export type ArchiveQueryState = readonly [
  ArchiveQuery,
  (q: ArchiveQuery, correction?: boolean) => void,
];

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

export const pageSize = 50;

// The API's search parameters; the dates become local day boundaries.
export function searchPath(f: ArchiveFilter, sort: Sort, page: number): string {
  return missionSearchPath({
    q: f.text,
    event: f.event,
    status: f.status,
    type_group: f.typeGroup,
    type: f.type,
    street: f.street,
    city: f.city,
    district: f.district,
    object: f.objectName,
    callee: f.callee,
    tag: f.tag,
    created_from: f.createdFrom && new Date(dayStart(f.createdFrom)).toISOString(),
    created_to: f.createdTo && new Date(dayStart(f.createdTo, 1)).toISOString(),
    sort: sort.key,
    order: sort.descending ? 'desc' : 'asc',
    page,
    page_size: pageSize,
  });
}

// Online, the API searches, sorts and pages every mission, those closed long
// ago included (the synced missions hold only recently closed ones). Its pages
// reload on mission events, as the path lies under /api/v1/missions. Offline,
// the missions stored in the browser are searched, sorted and paged instead.
export function useMissionArchive({
  initialStatus = '',
  state,
}: {
  initialStatus?: string;
  state?: ArchiveQueryState;
}) {
  const offline = useOffline();
  const { missionTypes, missionTypeGroups } = useCatalogs();
  const [ownQuery, setOwnQuery] = useState<ArchiveQuery>(() => ({
    filter: { ...emptyFilter, status: initialStatus },
    sort: defaultSort,
    page: 1,
  }));
  const [query, setQuery] = state ?? [ownQuery, setOwnQuery];
  const { filter, sort, page } = query;
  const setPage = (p: number) => setQuery({ ...query, page: p });

  const remote = useResource<MissionSearchPage>(offline ? null : searchPath(filter, sort, page));
  const local = useMissions({ closed: offline });

  // The last page stays shown while the next one loads, so the table does
  // not collapse on every page turn.
  const [shown, setShown] = useState<MissionSearchPage | undefined>(undefined);
  if (remote.data !== undefined && remote.data !== shown) setShown(remote.data);

  const catalogs = useMemo(
    () => ({ types: missionTypes.byId, groups: missionTypeGroups.byId }),
    [missionTypes.byId, missionTypeGroups.byId],
  );
  const localMatches = useMemo(
    () =>
      offline ? local.items.filter(matcher(filter, catalogs)).sort(comparator(sort, catalogs)) : [],
    [offline, local.items, filter, sort, catalogs],
  );

  const total = offline ? localMatches.length : (shown?.total ?? 0);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  // Matches may vanish (a mission was deleted) and leave the page past the end.
  const loaded = offline || remote.data !== undefined;
  // In an effect, as the query may live in the URL, which is not to be
  // navigated during render.
  const pastEnd = loaded && page > pages;
  useEffect(() => {
    if (pastEnd) setQuery({ ...query, page: pages }, true);
  }, [pastEnd, pages, query, setQuery]);

  const results = offline
    ? localMatches.slice((page - 1) * pageSize, page * pageSize)
    : (shown?.missions ?? []);

  // A new filter or order starts on the first page.
  const setFilter = (f: ArchiveFilter) => setQuery({ ...query, filter: f, page: 1 });
  // A second click on the sorted column reverses it; dates start newest first.
  const sortBy = (key: SortKey) =>
    setQuery({
      ...query,
      sort:
        sort.key === key
          ? { key, descending: !sort.descending }
          : { key, descending: key === 'created' },
      page: 1,
    });

  return {
    filter,
    setFilter,
    sort,
    sortBy,
    results,
    total,
    page,
    pages,
    setPage,
    offline,
    // Nothing to show yet; a later page turn keeps the last page meanwhile.
    loading: offline ? local.loading : shown === undefined && remote.error === null,
    // Loading another page.
    busy: !offline && remote.data === undefined && remote.error === null,
    error: offline ? local.error : remote.error,
    catalogs,
  };
}
