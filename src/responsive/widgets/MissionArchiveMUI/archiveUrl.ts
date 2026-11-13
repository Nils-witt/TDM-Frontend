import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import {
  type ArchiveFilter,
  type ArchiveQuery,
  type ArchiveQueryState,
  defaultSort,
  emptyFilter,
  type SortKey,
  sortColumns,
} from '@/pages/dashboard/widgets/MissionArchive/MissionArchive.ts';

// The URL parameter of each filter field.
const params: [keyof ArchiveFilter, string][] = [
  ['text', 'q'],
  ['event', 'event'],
  ['status', 'status'],
  ['typeGroup', 'group'],
  ['type', 'type'],
  ['street', 'street'],
  ['city', 'city'],
  ['district', 'district'],
  ['objectName', 'object'],
  ['callee', 'callee'],
  ['tag', 'tag'],
  ['unit', 'unit'],
  ['createdFrom', 'from'],
  ['createdTo', 'to'],
];

function fromParams(p: URLSearchParams, initialStatus: string): ArchiveQuery {
  const filter = { ...emptyFilter, status: initialStatus };
  for (const [key, name] of params) {
    const v = p.get(name);
    if (v !== null) filter[key] = v;
  }
  const key = sortColumns.find((c) => c.key === p.get('sort'))?.key;
  const sort = key
    ? { key, descending: p.get('order') === 'desc' }
    : p.has('order')
      ? { ...defaultSort, descending: p.get('order') === 'desc' }
      : defaultSort;
  const page = Math.max(1, Math.floor(Number(p.get('page'))) || 1);
  return { filter, sort, page };
}

function toParams(q: ArchiveQuery, initialStatus: string): URLSearchParams {
  const p = new URLSearchParams();
  for (const [key, name] of params) {
    const v = q.filter[key];
    // An empty status is kept when the start status is another one: Any.
    if (key === 'status' ? v !== initialStatus : v !== '') p.set(name, v);
  }
  if (q.sort.key !== defaultSort.key) p.set('sort', q.sort.key satisfies SortKey);
  if (q.sort.key !== defaultSort.key || q.sort.descending !== defaultSort.descending)
    p.set('order', q.sort.descending ? 'desc' : 'asc');
  if (q.page > 1) p.set('page', String(q.page));
  return p;
}

// The archive's query in the URL, so Back from a mission restores the search.
// A page turn adds a history entry; a new filter or order replaces it.
export function useArchiveUrlState(initialStatus: string): ArchiveQueryState {
  const [search, setSearch] = useSearchParams();
  const query = useMemo(() => fromParams(search, initialStatus), [search, initialStatus]);
  const set = useCallback(
    (q: ArchiveQuery, correction = false) =>
      setSearch(toParams(q, initialStatus), {
        replace:
          correction ||
          q.page === query.page ||
          q.filter !== query.filter ||
          q.sort.key !== query.sort.key ||
          q.sort.descending !== query.sort.descending,
      }),
    [setSearch, initialStatus, query],
  );
  return [query, set] as const;
}
