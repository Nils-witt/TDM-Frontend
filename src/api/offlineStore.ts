import { type DBSchema, type IDBPDatabase, openDB } from 'idb';
import type { AuthConfig, Principal } from './auth';

// What the app last loaded, so it can still be read while the API cannot be
// reached, a reload or a new tab included. It belongs to one user: it is
// cleared on logout, on a 401 and when someone else signs in.

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

interface OfflineDB extends DBSchema {
  resources: { key: string; value: { data: unknown; savedAt: number } };
  blobs: {
    key: string;
    value: { blob: Blob; size: number; savedAt: number };
    indexes: { savedAt: number };
  };
  meta: { key: 'session'; value: SavedSession };
}

let db: Promise<IDBPDatabase<OfflineDB> | null> | null = null;

// Null where IndexedDB is blocked (some private windows): no offline data.
function open(): Promise<IDBPDatabase<OfflineDB> | null> {
  db ??= openDB<OfflineDB>('universam-offline', 1, {
    upgrade(d) {
      d.createObjectStore('resources');
      d.createObjectStore('blobs').createIndex('savedAt', 'savedAt');
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

async function purgeExpired(d: IDBPDatabase<OfflineDB>) {
  const tx = d.transaction(['resources', 'blobs'], 'readwrite');
  for (const name of ['resources', 'blobs'] as const) {
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

export type SavedResource = { data: unknown; savedAt: number };

export const getResource = (path: string) =>
  attempt(async (d) => {
    const r = await d.get('resources', path);
    return r && fresh(r.savedAt) ? r : undefined;
  });

export const putResource = (path: string, data: unknown) =>
  attempt((d) => d.put('resources', { data, savedAt: Date.now() }, path));

export const getBlob = (path: string) =>
  attempt(async (d) => {
    const r = await d.get('blobs', path);
    return r && fresh(r.savedAt) ? r.blob : undefined;
  });

export const hasBlob = async (path: string) => (await getBlob(path)) !== undefined;

export const putBlob = (path: string, blob: Blob) =>
  attempt(async (d) => {
    if (blob.size > maxBlobBytes) return;
    await d.put('blobs', { blob, size: blob.size, savedAt: Date.now() }, path);
    const tx = d.transaction('blobs', 'readwrite');
    let total = 0;
    // Newest first, so what is over the limit is the oldest.
    let cursor = await tx.store.index('savedAt').openCursor(null, 'prev');
    while (cursor) {
      total += cursor.value.size;
      if (total > maxBlobBytes) await cursor.delete();
      cursor = await cursor.continue();
    }
    await tx.done;
  });

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
    const tx = d.transaction(['resources', 'blobs', 'meta'], 'readwrite');
    await Promise.all([
      tx.objectStore('resources').clear(),
      tx.objectStore('blobs').clear(),
      tx.objectStore('meta').clear(),
    ]);
    await tx.done;
  });
  try {
    await caches.delete(mapTilesCache);
  } catch {
    // no Cache Storage (plain http other than localhost)
  }
}
