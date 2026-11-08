import { request } from './client';

// The API caps larger limits to this.
const pageLimit = 200;

type Page = { next_before?: string } & Record<string, unknown>;

// The list endpoints answer a page at a time, newest first, with the cursor
// of the next page in next_before. key is the property holding the items,
// e.g. `missions`.
export async function requestAll<T>(path: string, key: string): Promise<T[]> {
  const [base, query = ''] = path.split('?', 2);
  const items: T[] = [];
  let before: string | undefined;
  do {
    const params = new URLSearchParams(query);
    params.set('limit', String(pageLimit));
    if (before) params.set('before', before);
    const page = await request<Page>(`${base}?${params}`);
    items.push(...((page[key] as T[] | undefined) ?? []));
    before = page.next_before;
  } while (before);
  return items;
}

// Create these at module level: useResource needs a stable fetcher.
export const listFetcher =
  <T>(key: string) =>
  (path: string) =>
    requestAll<T>(path, key);
