import { useEffect, useRef } from 'react';
import { requestCachedBlob } from '@/api/client';
import { offline, onConnectivityChange } from '@/api/connectivity';
import {
  fetchLogEntries,
  fetchLogFiles,
  fileContentPath,
  type LogFile,
  logEntriesPath,
  logFilesPath,
} from '@/api/logbook';
import { hasBlob } from '@/api/offlineStore';
import { type Fetcher, type ResourceCache, useResourceCache } from '@/api/resource';
import { fetchTasks, tasksPath } from '@/api/tasks';
import { useMissions } from './missionsContext';

// Keeps the logbook, files, tasks and attachment contents of every mission
// that is not closed in the offline store, so they can be read offline
// without having been opened. Subscribing makes them count as shown: the
// event stream keeps them current like what is on screen.

const missionPaths = (id: string): [string, Fetcher][] => [
  [logEntriesPath(id), fetchLogEntries as Fetcher],
  [logFilesPath(id), fetchLogFiles as Fetcher],
  [tasksPath(id), fetchTasks as Fetcher],
];

// Subscribes to path; resolves with the unsubscribe once it has data or an
// error, so missions are loaded one after the other.
function subscribeLoaded(
  cache: ResourceCache,
  path: string,
  fetch: Fetcher,
  onChange: () => void,
): Promise<() => void> {
  return new Promise((resolve) => {
    let settled = false;
    const check = () => {
      onChange();
      const s = cache.state(path);
      if (!settled && (s.data !== undefined || s.error !== null)) {
        settled = true;
        resolve(unsubscribe);
      }
    };
    const unsubscribe = cache.subscribe(path, check, fetch);
    // Already loaded for a widget showing it: no change may follow.
    check();
  });
}

// One request at a time, while online, so the prefetch does not crowd out
// what the user is looking at.
function createBlobQueue() {
  const queued = new Set<string>();
  let running = false;

  const run = async () => {
    if (running) return;
    running = true;
    try {
      for (const path of queued) {
        if (offline()) return;
        queued.delete(path);
        if (await hasBlob(path)) continue;
        await requestCachedBlob(path).catch(() => undefined);
      }
    } finally {
      running = false;
    }
  };

  return {
    add(paths: string[]) {
      paths.forEach((p) => queued.add(p));
      void run();
    },
    run,
  };
}

function OfflinePrefetch() {
  const cache = useResourceCache();
  const { items: missions } = useMissions();
  // Mission ID → unsubscribe, while prefetched.
  const subscribed = useRef(new Map<string, () => void>());
  const queue = useRef(createBlobQueue());

  useEffect(() => onConnectivityChange(() => void queue.current.run()), []);

  useEffect(() => {
    const subs = subscribed.current;
    const wanted = new Set(missions.filter((m) => m.status !== 'closed').map((m) => m.id));
    for (const [id, unsubscribe] of subs) {
      if (!wanted.has(id)) {
        unsubscribe();
        subs.delete(id);
      }
    }
    let stopped = false;
    void (async () => {
      for (const id of wanted) {
        if (stopped) return;
        if (subs.has(id)) continue;
        const parts: (() => void)[] = [];
        let removed = false;
        const unsubscribeAll = () => {
          removed = true;
          parts.forEach((u) => u());
        };
        subs.set(id, unsubscribeAll);
        for (const [path, fetch] of missionPaths(id)) {
          const onChange =
            path === logFilesPath(id)
              ? () => {
                  const files = cache.state(path).data as LogFile[] | undefined;
                  if (files) queue.current.add(files.map((f) => fileContentPath(f.id)));
                }
              : () => undefined;
          const unsubscribe = await subscribeLoaded(cache, path, fetch, onChange);
          // Closed or gone meanwhile.
          if (removed) {
            unsubscribe();
            break;
          }
          parts.push(unsubscribe);
        }
      }
    })();
    return () => {
      stopped = true;
    };
  }, [cache, missions]);

  useEffect(() => {
    const subs = subscribed.current;
    return () => {
      subs.forEach((unsubscribe) => unsubscribe());
      subs.clear();
    };
  }, []);

  return null;
}

export default OfflinePrefetch;
