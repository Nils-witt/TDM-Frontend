import { useEffect, useRef } from 'react';
import { requestCachedBlob } from '@/api/client';
import { offline, onConnectivityChange } from '@/api/connectivity';
import { fileContentPath, type LogFile } from '@/api/logbook';
import { hasDigest } from '@/api/offlineStore';
import { type Replica, scopeKey, useReplica } from '@/api/replica';
import { useMissions } from './missionsContext';

// Keeps the logbook, files, tasks, unit assignments and attachment contents of every mission
// that is not closed in the offline store, so they can be read offline
// without having been opened. Subscribing makes them count as shown: the
// event stream keeps them current like what is on screen.

const missionScopes = (id: string) => [
  scopeKey('log_entries', id),
  scopeKey('log_files', id),
  scopeKey('tasks', id),
  scopeKey('mission_units', id),
];

// Subscribes to a scope; resolves with the unsubscribe once it has rows or an
// error, so missions are loaded one after the other.
function subscribeLoaded(replica: Replica, key: string, onChange: () => void): Promise<() => void> {
  return new Promise((resolve) => {
    let settled = false;
    const check = () => {
      onChange();
      if (!settled && !replica.snapshot(key).loading) {
        settled = true;
        resolve(unsubscribe);
      }
    };
    const unsubscribe = replica.subscribe(key, check);
    // Already loaded for a widget showing it: no change may follow.
    check();
  });
}

// One request at a time, while online, so the prefetch does not crowd out
// what the user is looking at. Contents are stored by digest: a file whose
// content is already stored, as another file's say, is not downloaded.
function createBlobQueue() {
  // Content path → digest.
  const queued = new Map<string, string>();
  let running = false;

  const run = async () => {
    if (running) return;
    running = true;
    try {
      for (const [path, digest] of queued) {
        if (offline()) return;
        queued.delete(path);
        if (await hasDigest(digest)) continue;
        await requestCachedBlob(path).catch(() => undefined);
      }
    } finally {
      running = false;
    }
  };

  return {
    add(files: readonly LogFile[]) {
      files.forEach((f) => queued.set(fileContentPath(f.id), f.digest));
      void run();
    },
    run,
  };
}

function OfflinePrefetch() {
  const replica = useReplica();
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
        for (const key of missionScopes(id)) {
          const onChange =
            key === scopeKey('log_files', id)
              ? () => {
                  const files = replica.snapshot(key).items as unknown as LogFile[];
                  queue.current.add(files);
                }
              : () => undefined;
          const unsubscribe = await subscribeLoaded(replica, key, onChange);
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
  }, [replica, missions]);

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
