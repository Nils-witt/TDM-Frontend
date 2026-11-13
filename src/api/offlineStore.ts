import { type DBSchema, type IDBPDatabase, openDB, type StoreNames } from 'idb';
import type { AuthConfig, Principal } from './auth';

// What the app last loaded, so it can still be read while the API cannot be
// reached, a reload or a new tab included. It belongs to one user: it is
// cleared on logout, on a 401 and when someone else signs in.
//
// The mission domain is a replica of the API's tables (migration
// 00004_missions.sql of universalGoApi): one store per table, named like it
// (and like the entity types of the event stream), holding the rows as the
// API returns them, with the table's indexes. api/replica.ts reads and syncs
// them. File contents are blobs addressed by their digest, as in the API.
// Everything else is kept per API path in resources.

// Data older than this is not shown and is deleted.
const maxAge = 24 * 60 * 60 * 1000;
// File contents (attachments, report PDFs); the oldest go first.
const maxBlobBytes = 100 * 1024 * 1024;
// The service worker's cache of map styles and tiles (vite.config.ts).
export const mapTilesCache = 'map-tiles';

export type SavedSession = {
  principal: Principal;
  mode: 'oidc' | 'proxy';
  // For reading the tab's tokens without GET /auth/config.
  config?: AuthConfig;
  savedAt: number;
};

export type Row = { id: string } & Record<string, unknown>;

// The index a table's rows are synced by, a mission's say; none for the
// tables that are synced whole.
export const tableIndex = {
  // Per status, as the API filters by one: closed ones only when asked for.
  missions: 'status',
  mission_type_groups: null,
  mission_types: null,
  logbook_types: null,
  file_types: null,
  scopes: null,
  log_entries: 'mission',
  log_files: 'mission',
  tasks: 'mission',
  mission_units: 'mission',
} as const;

export type ReplicaTable = keyof typeof tableIndex;
export const replicaTables = Object.keys(tableIndex) as ReplicaTable[];

// A part of a table that is loaded with one list request: all of it, or the
// rows with value in index.
export type Scope = { table: ReplicaTable; index: string | null; value: string | null };

type SyncRecord = Scope & { syncedAt: number };
type BlobRecord = { blob: Blob; size: number; savedAt: number };

type Table<I extends Record<string, IDBValidKey> = Record<string, never>> = {
  key: string;
  value: Row;
  indexes: I;
};

interface OfflineDB extends DBSchema {
  missions: Table<{ status: string }>;
  mission_type_groups: Table;
  mission_types: Table<{ group_id: string }>;
  logbook_types: Table;
  file_types: Table;
  scopes: Table;
  log_entries: Table<{ mission: string }>;
  log_files: Table<{ mission: string; entry: string; digest: string }>;
  tasks: Table<{ mission: string }>;
  mission_units: Table<{ mission: string }>;
  // Key: the scope key (replica.ts).
  syncs: { key: string; value: SyncRecord };
  // Key: the lowercase hex SHA-256 of the content.
  blobs: { key: string; value: BlobRecord; indexes: { savedAt: number } };
  // Content not addressed by a known digest (report PDFs), by API path.
  contents: { key: string; value: BlobRecord; indexes: { savedAt: number } };
  resources: { key: string; value: { data: unknown; savedAt: number } };
  meta: { key: 'session'; value: SavedSession };
}

type StoreName = StoreNames<OfflineDB>;

const allStores: StoreName[] = [
  ...replicaTables,
  'syncs',
  'blobs',
  'contents',
  'resources',
  'meta',
];

let db: Promise<IDBPDatabase<OfflineDB> | null> | null = null;

function createMissionUnits(d: IDBPDatabase<OfflineDB>) {
  d.createObjectStore('mission_units', { keyPath: 'id' }).createIndex('mission', 'mission');
}

function createScopes(d: IDBPDatabase<OfflineDB>) {
  d.createObjectStore('scopes', { keyPath: 'id' });
}

// Null where IndexedDB is blocked (some private windows): no offline data.
function open(): Promise<IDBPDatabase<OfflineDB> | null> {
  db ??= openDB<OfflineDB>('universam-offline', 5, {
    upgrade(d, oldVersion, _newVersion, tx) {
      if (oldVersion >= 2) {
        // Version 2 synced missions whole. Its record would clear the store
        // once expired, rows of the per-status scopes included.
        if (oldVersion === 2) {
          tx.objectStore('missions').createIndex('status', 'status');
          void tx.objectStore('syncs').delete('missions');
        }
        // Version 4 added the unit assignments.
        if (oldVersion < 4) createMissionUnits(d);
        // Version 5 added the mission scopes.
        if (oldVersion < 5) createScopes(d);
        return;
      }
      // Version 1 kept the mission domain per path and blobs per path. It
      // was only a cache, so it starts over.
      for (const name of Array.from(d.objectStoreNames)) d.deleteObjectStore(name);
      d.createObjectStore('missions', { keyPath: 'id' }).createIndex('status', 'status');
      d.createObjectStore('mission_type_groups', { keyPath: 'id' });
      d.createObjectStore('mission_types', { keyPath: 'id' }).createIndex('group_id', 'group_id');
      d.createObjectStore('logbook_types', { keyPath: 'id' });
      d.createObjectStore('file_types', { keyPath: 'id' });
      createScopes(d);
      d.createObjectStore('log_entries', { keyPath: 'id' }).createIndex('mission', 'mission');
      const files = d.createObjectStore('log_files', { keyPath: 'id' });
      files.createIndex('mission', 'mission');
      files.createIndex('entry', 'entry');
      files.createIndex('digest', 'digest');
      d.createObjectStore('tasks', { keyPath: 'id' }).createIndex('mission', 'mission');
      createMissionUnits(d);
      d.createObjectStore('syncs');
      d.createObjectStore('blobs').createIndex('savedAt', 'savedAt');
      d.createObjectStore('contents').createIndex('savedAt', 'savedAt');
      d.createObjectStore('resources');
      d.createObjectStore('meta');
    },
  })
    .then(async (d) => {
      await purgeExpired(d);
      return d;
    })
    .catch((err: unknown) => {
      console.warn('Offline cache unavailable', err);
      return null;
    });
  return db;
}

const fresh = (savedAt: number) => Date.now() - savedAt < maxAge;

// What reads a scope: its table, or the table's index. idb types index
// names per store, which a table chosen at run time cannot use.
type Lookup = {
  getAll: (query?: IDBValidKey | null) => Promise<Row[]>;
  getAllKeys: (query?: IDBValidKey | null) => Promise<IDBValidKey[]>;
  delete: (key: IDBValidKey) => Promise<void>;
  clear: () => Promise<void>;
};
type Transaction = { objectStore: (name: ReplicaTable) => unknown };

const tableOf = (tx: Transaction, scope: Scope) => tx.objectStore(scope.table) as Lookup;

function scopeLookup(tx: Transaction, scope: Scope): [Lookup, IDBValidKey | null] {
  const store = tableOf(tx, scope) as Lookup & { index: (name: string) => Lookup };
  return scope.index === null || scope.value === null
    ? [store, null]
    : [store.index(scope.index), scope.value];
}

// The primary keys of a scope's rows.
async function scopeKeys(tx: Transaction, scope: Scope): Promise<string[]> {
  const [lookup, query] = scopeLookup(tx, scope);
  return (await lookup.getAllKeys(query)) as string[];
}

async function deleteScope(tx: Transaction, scope: Scope) {
  const store = tableOf(tx, scope);
  if (scope.index === null) {
    await store.clear();
    return;
  }
  for (const key of await scopeKeys(tx, scope)) await store.delete(key);
}

// A scope not synced for maxAge is dropped with its rows, as are other
// entries older than that.
async function purgeExpired(d: IDBPDatabase<OfflineDB>) {
  const tx = d.transaction(allStores, 'readwrite');
  let sync = await tx.objectStore('syncs').openCursor();
  while (sync) {
    if (!fresh(sync.value.syncedAt)) {
      await deleteScope(tx, sync.value);
      await sync.delete();
    }
    sync = await sync.continue();
  }
  for (const name of ['resources', 'blobs', 'contents'] as const) {
    let cursor = await tx.objectStore(name).openCursor();
    while (cursor) {
      if (!fresh(cursor.value.savedAt)) await cursor.delete();
      cursor = await cursor.continue();
    }
  }
  await tx.done;
}

// Never fails: without storage the app works as if nothing were cached.
async function attempt<T>(f: (d: IDBPDatabase<OfflineDB>) => Promise<T>): Promise<T | undefined> {
  try {
    const d = await open();
    return d ? await f(d) : undefined;
  } catch (err) {
    console.warn('Offline cache', err);
    return undefined;
  }
}

// The rows of a scope and when it was last synced (undefined: never, or no
// storage).
export const readScope = (key: string, scope: Scope) =>
  attempt(async (d) => {
    const tx = d.transaction([scope.table, 'syncs']);
    const [lookup, query] = scopeLookup(tx, scope);
    const rows = await lookup.getAll(query);
    const sync = await tx.objectStore('syncs').get(key);
    return { rows, syncedAt: sync && fresh(sync.syncedAt) ? sync.syncedAt : undefined };
  });

// Replaces a scope's rows by what a list request returned: the rows it left
// out were deleted (or revoked) in the API.
export const writeScope = (key: string, scope: Scope, rows: Row[]) =>
  attempt(async (d) => {
    const tx = d.transaction([scope.table, 'syncs'], 'readwrite');
    const store = tx.objectStore(scope.table);
    const ids = new Set(rows.map((r) => r.id));
    for (const old of await scopeKeys(tx, scope)) {
      if (!ids.has(old)) await store.delete(old);
    }
    for (const row of rows) await store.put(row);
    await tx.objectStore('syncs').put({ ...scope, syncedAt: Date.now() }, key);
    await tx.done;
  });

// For rows a write returned or removed.
export const putRow = (table: ReplicaTable, row: Row) => attempt((d) => d.put(table, row));
export const deleteRow = (table: ReplicaTable, id: string) => attempt((d) => d.delete(table, id));

export type SavedResource = { data: unknown; savedAt: number };

export const getResource = (path: string) =>
  attempt(async (d) => {
    const r = await d.get('resources', path);
    return r && fresh(r.savedAt) ? r : undefined;
  });

export const putResource = (path: string, data: unknown) =>
  attempt((d) => d.put('resources', { data, savedAt: Date.now() }, path));

const logFileContent = /^\/api\/v1\/log-files\/([^/?]+)\/content$/;

// Where a path's content is kept: a log file's under its digest, if the
// replica has the file, so equal attachments are stored (and fetched) once.
async function contentKey(
  d: IDBPDatabase<OfflineDB>,
  path: string,
): Promise<['blobs' | 'contents', string]> {
  const m = logFileContent.exec(path);
  if (m) {
    const file = await d.get('log_files', decodeURIComponent(m[1]));
    if (typeof file?.digest === 'string') return ['blobs', file.digest];
  }
  return ['contents', path];
}

// Content paths never stored: the attachments of missions closed long ago,
// whose rows are kept in memory only (replica.ts, transient scopes).
const keptOut = new Set<string>();

export const keepContentOut = (path: string) => {
  keptOut.add(path);
};

export const getContent = async (path: string) =>
  keptOut.has(path)
    ? undefined
    : attempt(async (d) => {
        const [store, key] = await contentKey(d, path);
        const r = await d.get(store, key);
        return r && fresh(r.savedAt) ? r.blob : undefined;
      });

export const hasDigest = async (digest: string) =>
  (await attempt(async (d) => {
    const r = await d.get('blobs', digest);
    return r !== undefined && fresh(r.savedAt);
  })) === true;

export const putContent = (path: string, blob: Blob) =>
  attempt(async (d) => {
    if (blob.size > maxBlobBytes || keptOut.has(path)) return;
    const [store, key] = await contentKey(d, path);
    await d.put(store, { blob, size: blob.size, savedAt: Date.now() }, key);
    await evictBlobs(d);
  });

// Both stores share the limit; what is over it is the oldest.
async function evictBlobs(d: IDBPDatabase<OfflineDB>) {
  const tx = d.transaction(['blobs', 'contents'], 'readwrite');
  const all: { store: 'blobs' | 'contents'; key: string; size: number; savedAt: number }[] = [];
  for (const store of ['blobs', 'contents'] as const) {
    let cursor = await tx.objectStore(store).openCursor();
    while (cursor) {
      all.push({ store, key: cursor.key, size: cursor.value.size, savedAt: cursor.value.savedAt });
      cursor = await cursor.continue();
    }
  }
  all.sort((a, b) => b.savedAt - a.savedAt);
  let total = 0;
  for (const b of all) {
    total += b.size;
    if (total > maxBlobBytes) await tx.objectStore(b.store).delete(b.key);
  }
  await tx.done;
}

export const loadSession = () =>
  attempt(async (d) => {
    const s = await d.get('meta', 'session');
    return s && fresh(s.savedAt) ? s : undefined;
  });

// Someone else's data is dropped before theirs is stored.
export const saveSession = (
  principal: Principal,
  mode: SavedSession['mode'],
  config?: AuthConfig,
) =>
  attempt(async (d) => {
    const before = await d.get('meta', 'session');
    if (before && before.principal.sub !== principal.sub) await clearOffline();
    await d.put('meta', { principal, mode, config, savedAt: Date.now() }, 'session');
  });

export async function clearOffline(): Promise<void> {
  await attempt(async (d) => {
    const tx = d.transaction(allStores, 'readwrite');
    await Promise.all(allStores.map((name) => tx.objectStore(name).clear()));
    await tx.done;
  });
  try {
    await caches.delete(mapTilesCache);
  } catch {
    // no Cache Storage (plain http other than localhost)
  }
}
