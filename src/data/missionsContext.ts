import { createContext, use, useMemo, useState } from 'react';
import type { Collection } from '@/api/collection';
import { type Mission, missionPath, missionStatuses } from '@/api/missions';
import { scopeKey, useTable } from '@/api/replica';
import { useResource } from '@/api/resource';

// Missions are synced per status (the API filters by one). Closed ones are
// final and pile up, so they are loaded only where asked for.
export const activeMissionKeys = missionStatuses
  .filter((s) => s.value !== 'closed')
  .map((s) => scopeKey('missions', s.value));
const closedMissionsKey = scopeKey('missions', 'closed');

export const MissionsContext = createContext<Collection<Mission> | null>(null);

// The missions that are not closed, newest first; with closed: true the
// closed ones too, loaded while the caller is shown.
export function useMissions({ closed = false }: { closed?: boolean } = {}): Collection<Mission> {
  const active = use(MissionsContext);
  if (!active) throw new Error('useMissions outside of MissionsProvider');
  const closedOnes = useTable<Mission>(closed ? closedMissionsKey : null);
  return useMemo(
    () => (closed ? joinCollections(active, closedOnes) : active),
    [closed, active, closedOnes],
  );
}

function joinCollections(a: Collection<Mission>, b: Collection<Mission>): Collection<Mission> {
  const byId = new Map(a.byId);
  for (const m of b.items) {
    const other = byId.get(m.id);
    // A mission closed just now may still be in the other until it synced.
    if (!other || m.updated_at > other.updated_at) byId.set(m.id, m);
  }
  return {
    items: [...byId.values()].sort((x, y) => (x.id < y.id ? 1 : x.id > y.id ? -1 : 0)),
    byId,
    loading: a.loading || b.loading,
    error: a.error ?? b.error,
    reload: () => Promise.all([a.reload(), b.reload()]).then(() => undefined),
  };
}

export type MissionLookup = {
  mission: Mission | null;
  // Until it is known whether the mission exists.
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  // Closed long ago: fetched on its own and, like its log and tasks, kept in
  // memory only.
  transient: boolean;
};

const keepOut = { persist: false };

// One mission of any status. The closed ones are loaded only for an ID that
// is not among the others. A mission that was just closed is kept until the
// closed ones have loaded, so it does not vanish meanwhile. The mission list
// leaves out missions closed more than a day ago (the archive finds them):
// one is fetched by its ID and not stored.
export function useMission(id: string | null): MissionLookup {
  const active = useMissions();
  const found = id === null ? undefined : active.byId.get(id);
  const lookClosed = id !== null && found === undefined && !active.loading;
  const closed = useTable<Mission>(lookClosed ? closedMissionsKey : null);
  const stored = found ?? (id === null ? undefined : closed.byId.get(id));
  const lookApi = lookClosed && stored === undefined && !closed.loading;
  const fetched = useResource<Mission>(lookApi ? missionPath(id) : null, undefined, keepOut);
  const fromApi = lookApi && fetched.data?.id === id ? fetched.data : undefined;
  const current = stored ?? fromApi;

  const [last, setLast] = useState<Mission | null>(null);
  if (current && current !== last) setLast(current);
  const mission = current ?? (closed.loading && last !== null && last.id === id ? last : null);

  const fetching = lookApi && fetched.data === undefined && fetched.error === null;
  const loading = mission === null && id !== null && (active.loading || closed.loading || fetching);
  const error =
    mission === null
      ? (active.error ?? (lookClosed ? closed.error : null) ?? (lookApi ? fetched.error : null))
      : null;
  const reload = lookApi ? fetched.reload : lookClosed ? closed.reload : active.reload;
  const transient = mission !== null && mission === fromApi;
  return useMemo(
    () => ({ mission, loading, error, reload, transient }),
    [mission, loading, error, reload, transient],
  );
}
