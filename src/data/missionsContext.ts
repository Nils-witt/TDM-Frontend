import { createContext, use, useMemo, useState } from 'react';
import type { Collection } from '@/api/collection';
import { type Mission, missionStatuses } from '@/api/missions';
import { scopeKey, useTable } from '@/api/replica';

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
};

// One mission of any status. The closed ones are loaded only for an ID that
// is not among the others. A mission that was just closed is kept until the
// closed ones have loaded, so it does not vanish meanwhile.
export function useMission(id: string | null): MissionLookup {
  const active = useMissions();
  const found = id === null ? undefined : active.byId.get(id);
  const lookClosed = id !== null && found === undefined && !active.loading;
  const closed = useTable<Mission>(lookClosed ? closedMissionsKey : null);
  const current = found ?? (id === null ? undefined : closed.byId.get(id));

  const [last, setLast] = useState<Mission | null>(null);
  if (current && current !== last) setLast(current);
  const mission = current ?? (closed.loading && last !== null && last.id === id ? last : null);

  const loading = mission === null && id !== null && (active.loading || closed.loading);
  const error = mission === null ? (active.error ?? (lookClosed ? closed.error : null)) : null;
  const reload = lookClosed ? closed.reload : active.reload;
  return useMemo(() => ({ mission, loading, error, reload }), [mission, loading, error, reload]);
}
