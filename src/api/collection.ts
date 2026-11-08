import { useMemo } from 'react';
import type { Fetcher } from './resource';
import { useResource } from './resource';

// A list loaded with all its pages, newest first, through the shared cache.
export type Collection<T extends { id: string }> = {
  items: readonly T[];
  byId: ReadonlyMap<string, T>;
  // Only until the first load answers; a reload keeps the items shown.
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

const none: readonly never[] = [];

// A null path is an empty collection that never loads.
export function useCollection<T extends { id: string }>(
  path: string | null,
  fetch: Fetcher<T[]>,
): Collection<T> {
  const { data, error, reload } = useResource<T[]>(path, fetch);
  return useMemo(() => {
    const items = data ?? none;
    return {
      items,
      byId: new Map(items.map((item) => [item.id, item])),
      loading: path !== null && data === undefined && error === null,
      error,
      reload,
    };
  }, [path, data, error, reload]);
}
