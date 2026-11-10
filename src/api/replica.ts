import { createContext, use, useCallback, useMemo, useSyncExternalStore } from 'react';
import {
  fileTypesPath,
  logbookTypesPath,
  missionTypeGroupsPath,
  missionTypesPath,
} from './catalogs';
import { ApiError } from './client';
import type { Collection } from './collection';
import { requestAll } from './list';
import { missionsPath } from './missions';
import {
  deleteRow,
  putRow,
  readScope,
  type ReplicaTable,
  type Row,
  type Scope,
  tableIndex,
  writeScope,
} from './offlineStore';

// The mission domain, read local-first from its replica in IndexedDB
// (offlineStore.ts): what was stored shows at once, after a reload or in a
// new tab too, and while the API cannot be reached. Showing a scope syncs it
// with one list request; the event stream syncs the shown ones again.
//
// The rows shown are kept in memory as well, so the app works the same where
// IndexedDB is blocked, only without anything stored.

// The list endpoint of each table and the property of its pages holding the
// rows. Scoped tables take their index as the query parameter.
const listOf: Record<ReplicaTable, { path: string; key: string }> = {
  missions: { path: missionsPath, key: 'missions' },
  mission_type_groups: { path: missionTypeGroupsPath, key: 'mission_type_groups' },
  mission_types: { path: missionTypesPath, key: 'mission_types' },
  logbook_types: { path: logbookTypesPath, key: 'logbook_types' },
  file_types: { path: fileTypesPath, key: 'file_types' },
  log_entries: { path: '/api/v1/log-entries', key: 'log_entries' },
  log_files: { path: '/api/v1/log-files', key: 'log_files' },
  tasks: { path: '/api/v1/tasks', key: 'tasks' },
};

// A whole table, or for a scoped one (log_entries, log_files, tasks) the rows
// of one mission. Hooks take the key, a string, so it can be a dependency.
export function scopeKey(table: ReplicaTable, value?: string): string {
  const index = tableIndex[table];
  if (index === null) return table;
  if (value === undefined) throw new Error(`${table} is synced per ${index}`);
  return `${table}?${new URLSearchParams({ [index]: value })}`;
}

function parseKey(key: string): Scope {
  const [table, query] = key.split('?', 2) as [ReplicaTable, string | undefined];
  if (!(table in tableIndex)) throw new Error(`Unknown table ${table}`);
  const index = tableIndex[table];
  const value = index === null ? null : new URLSearchParams(query).get(index);
  if (index !== null && value === null) throw new Error(`${key} lacks its ${index}`);
  return { table, index, value };
}

const pathOf = (s: Scope) =>
  s.index === null || s.value === null
    ? listOf[s.table].path
    : `${listOf[s.table].path}?${new URLSearchParams({ [s.index]: s.value })}`;

const inScope = (s: Scope, row: Row) => s.index === null || row[s.index] === s.value;

// Newest first, as the API lists them: UUIDv7 IDs sort by creation time.
const newestFirst = (a: Row, b: Row) => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);

export type Snapshot = {
  items: readonly Row[];
  byId: ReadonlyMap<string, Row>;
  // Until the scope was synced once (now or before) or has rows.
  loading: boolean;
  error: string | null;
  // When the rows were last synced with the API.
  syncedAt?: number;
};

const snapshot = (items: Row[], rest: Omit<Snapshot, 'items' | 'byId'>): Snapshot => ({
  ...rest,
  items,
  byId: new Map(items.map((r) => [r.id, r])),
});

type Entry = {
  scope: Scope;
  snap: Snapshot;
  listeners: Set<() => void>;
  // The stored rows, read once; a sync answered before replaces them.
  restored: Promise<void>;
  synced: boolean;
  inflight: Promise<void> | null;
  queued: Promise<void> | null;
};

export type Replica = {
  subscribe: (key: string, listener: () => void) => () => void;
  snapshot: (key: string) => Snapshot;
  // Resolves once rows requested after the call have arrived (or failed).
  sync: (key: string) => Promise<void>;
  // For a row a write returned, and one it removed.
  put: (table: ReplicaTable, row: Row) => void;
  remove: (table: ReplicaTable, id: string) => void;
  // Syncs the shown scopes of these tables (the event stream's entity
  // types), or of every table.
  syncShown: (tables: readonly string[] | 'all') => void;
};

export function createReplica(): Replica {
  const entries = new Map<string, Entry>();

  const set = (e: Entry, snap: Snapshot) => {
    e.snap = snap;
    e.listeners.forEach((l) => l());
  };

  const entry = (key: string): Entry => {
    let e = entries.get(key);
    if (e) return e;
    const created: Entry = {
      scope: parseKey(key),
      snap: snapshot([], { loading: true, error: null }),
      listeners: new Set(),
      restored: Promise.resolve(),
      synced: false,
      inflight: null,
      queued: null,
    };
    created.restored = readScope(key, created.scope).then((stored) => {
      if (!stored || created.synced) return;
      const { rows, syncedAt } = stored;
      if (syncedAt === undefined && rows.length === 0) return;
      set(created, snapshot(rows.sort(newestFirst), { loading: false, error: null, syncedAt }));
    });
    entries.set(key, created);
    return created;
  };

  const start = (key: string, e: Entry): Promise<void> => {
    const p = requestAll<Row>(pathOf(e.scope), listOf[e.scope.table].key)
      .then(
        async (rows) => {
          // Stored first, so what reads the store (file contents by digest)
          // finds what is shown.
          await writeScope(key, e.scope, rows);
          e.synced = true;
          set(e, snapshot(rows, { loading: false, error: null, syncedAt: Date.now() }));
        },
        async (err: Error) => {
          await e.restored;
          // Without an answer, rows already shown stay shown without an
          // error: the offline banner says why they are not current.
          if (!(err instanceof ApiError) && !e.snap.loading) return;
          set(e, { ...e.snap, loading: false, error: err.message });
        },
      )
      .then(() => {
        e.inflight = null;
      });
    e.inflight = p;
    return p;
  };

  const sync = (key: string): Promise<void> => {
    const e = entry(key);
    if (!e.inflight) return start(key, e);
    // The running request may have been answered before what asked for the
    // sync: sync again after it, once however many requests come in.
    e.queued ??= e.inflight.then(() => {
      e.queued = null;
      return start(key, e);
    });
    return e.queued;
  };

  const subscribe = (key: string, listener: () => void) => {
    const e = entry(key);
    e.listeners.add(listener);
    // Nobody showed the scope until now, so what is stored may be outdated.
    if (e.listeners.size === 1 && !e.inflight) void start(key, e);
    return () => {
      e.listeners.delete(listener);
    };
  };

  // Applies a write's result to every scope holding the row. A sync running
  // now may have been answered before the write.
  const change = (table: ReplicaTable, id: string, row: Row | null) => {
    for (const [key, e] of entries) {
      if (e.scope.table !== table) continue;
      const had = e.snap.byId.has(id);
      if (!had && (row === null || !inScope(e.scope, row))) continue;
      const rest = e.snap.items.filter((r) => r.id !== id);
      const items = row && inScope(e.scope, row) ? [...rest, row].sort(newestFirst) : rest;
      set(e, snapshot(items, { ...e.snap, loading: false }));
      if (e.inflight) void sync(key);
    }
  };

  const put = (table: ReplicaTable, row: Row) => {
    void putRow(table, row);
    change(table, row.id, row);
  };

  const remove = (table: ReplicaTable, id: string) => {
    void deleteRow(table, id);
    change(table, id, null);
  };

  const syncShown = (tables: readonly string[] | 'all') => {
    for (const [key, e] of entries) {
      if (e.listeners.size > 0 && (tables === 'all' || tables.includes(e.scope.table))) {
        void sync(key);
      }
    }
  };

  return { subscribe, snapshot: (key) => entry(key).snap, sync, put, remove, syncShown };
}

export const ReplicaContext = createContext<Replica | null>(null);

export function useReplica(): Replica {
  const replica = use(ReplicaContext);
  if (!replica) throw new Error('useReplica outside of ResourceProvider');
  return replica;
}

const none = snapshot([], { loading: false, error: null });
const noSubscribe = () => () => undefined;
const noSnapshot = () => none;
const noSync = () => Promise.resolve();

// The rows of a scope (scopeKey) as a collection, synced when first shown and
// on reload. A null key is an empty collection that never loads. T must be
// the row type of the scope's table.
export function useTable<T extends { id: string }>(key: string | null): Collection<T> {
  const replica = useReplica();

  const subscribe = useCallback(
    (listener: () => void) => (key === null ? noSubscribe() : replica.subscribe(key, listener)),
    [replica, key],
  );
  const snap = useSyncExternalStore(
    subscribe,
    key === null ? noSnapshot : () => replica.snapshot(key),
  );
  const reload = useCallback(() => (key === null ? noSync() : replica.sync(key)), [replica, key]);

  return useMemo(
    () => ({
      items: snap.items as unknown as readonly T[],
      byId: snap.byId as unknown as ReadonlyMap<string, T>,
      loading: snap.loading,
      error: snap.error,
      reload,
    }),
    [snap, reload],
  );
}
