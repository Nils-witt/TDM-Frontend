import { createContext, use, useCallback, useState, useSyncExternalStore } from 'react';
import { request } from './client';

// A failed reload keeps the data loaded before.
export type ResourceState<T> = { data: T | undefined; error: string | null };

// Loads the data of a path; request(path) by default. One that pages through a
// list, say. It must be stable (module level): it is a hook dependency.
export type Fetcher<T = unknown> = (path: string) => Promise<T>;

const defaultFetcher: Fetcher = (path) => request<unknown>(path);

type Entry = {
  state: ResourceState<unknown>;
  listeners: Set<() => void>;
  // The last one a caller passed; all callers of one path pass the same.
  fetch: Fetcher;
  // queued is the load to run after inflight, because something changed while
  // it was running.
  inflight: Promise<void> | null;
  queued: Promise<void> | null;
};

// Every component showing one path gets the same data from a single request,
// and a burst of reloads during a load is coalesced into one reload after it.
export type ResourceCache = {
  subscribe: (path: string, listener: () => void, fetch?: Fetcher) => () => void;
  state: (path: string) => ResourceState<unknown>;
  // Resolves once data requested after the call has arrived (or failed).
  load: (path: string, fetch?: Fetcher) => Promise<void>;
  // For data a write returned.
  put: (path: string, data: unknown) => void;
  // Reloads the shown paths match accepts. Paths nobody shows load anyway
  // when they are shown again.
  reloadShown: (match: (path: string) => boolean) => void;
};

const initial: ResourceState<never> = { data: undefined, error: null };

export function createResourceCache(): ResourceCache {
  const entries = new Map<string, Entry>();

  const entry = (path: string, fetch?: Fetcher): Entry => {
    let e = entries.get(path);
    if (!e) {
      e = {
        state: initial,
        listeners: new Set(),
        fetch: defaultFetcher,
        inflight: null,
        queued: null,
      };
      entries.set(path, e);
    }
    if (fetch) e.fetch = fetch;
    return e;
  };

  const set = (e: Entry, state: ResourceState<unknown>) => {
    e.state = state;
    e.listeners.forEach((l) => l());
  };

  const start = (path: string, e: Entry): Promise<void> => {
    const p = e
      .fetch(path)
      .then(
        (data) => set(e, { data, error: null }),
        (err: Error) => set(e, { ...e.state, error: err.message }),
      )
      .then(() => {
        e.inflight = null;
      });
    e.inflight = p;
    return p;
  };

  const load = (path: string, fetch?: Fetcher): Promise<void> => {
    const e = entry(path, fetch);
    if (!e.inflight) return start(path, e);
    // The running load may have been answered before what asked for the
    // reload: load again after it, once however many requests come in.
    e.queued ??= e.inflight.then(() => {
      e.queued = null;
      return start(path, e);
    });
    return e.queued;
  };

  const subscribe = (path: string, listener: () => void, fetch?: Fetcher) => {
    const e = entry(path, fetch);
    e.listeners.add(listener);
    // Nobody showed the path until now, so what is cached may be outdated.
    if (e.listeners.size === 1 && !e.inflight) void start(path, e);
    return () => {
      e.listeners.delete(listener);
    };
  };

  const put = (path: string, data: unknown) => {
    const e = entry(path);
    set(e, { data, error: null });
    // A load running now may have been answered before the write.
    if (e.inflight) void load(path);
  };

  const reloadShown = (match: (path: string) => boolean) => {
    for (const [path, e] of entries) {
      if (e.listeners.size > 0 && match(path)) void load(path);
    }
  };

  return { subscribe, state: (path) => entry(path).state, load, put, reloadShown };
}

export const ResourceCacheContext = createContext<ResourceCache | null>(null);

export function useResourceCache(): ResourceCache {
  const cache = use(ResourceCacheContext);
  if (!cache) throw new Error('useResourceCache outside of ResourceProvider');
  return cache;
}

const noSubscribe = () => () => undefined;
const noState = () => initial;
const noLoad = () => Promise.resolve();

// Loads when the first component shows path, and again on reload. A null path
// loads nothing.
export function useResource<T>(
  path: string | null,
  fetch?: Fetcher<T>,
): ResourceState<T> & { reload: () => Promise<void> } {
  const cache = useResourceCache();

  const subscribe = useCallback(
    (listener: () => void) =>
      path === null ? noSubscribe() : cache.subscribe(path, listener, fetch),
    [cache, path, fetch],
  );
  const state = useSyncExternalStore(
    subscribe,
    path === null ? noState : () => cache.state(path),
  ) as ResourceState<T>;
  const reload = useCallback(
    () => (path === null ? noLoad() : cache.load(path, fetch)),
    [cache, path, fetch],
  );

  return { ...state, reload };
}

// The error a component sets itself (after a failed write, say) wins over the
// load error of its resources. Setting null dismisses the shown load error; a
// later failure after a successful load shows again.
export function useErrorState(
  loadError: string | null,
): [string | null, (error: string | null) => void] {
  const [own, setOwn] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  if (loadError === null && dismissed !== null) setDismissed(null);

  const setError = useCallback(
    (error: string | null) => {
      setOwn(error);
      if (error === null) setDismissed(loadError);
    },
    [loadError],
  );

  return [own ?? (loadError !== dismissed ? loadError : null), setError];
}
