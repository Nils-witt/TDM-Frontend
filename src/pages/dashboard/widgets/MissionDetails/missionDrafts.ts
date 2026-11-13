import { useEffect, useSyncExternalStore } from 'react';
import type { Mission } from '@/api/missions';

// The unsaved edits of the mission forms open in this window, so the Map can
// show a mission as it will be once saved (its option show-unsaved). A form
// registers only while it has edits; with several forms of one mission, the
// one registered last wins.

export type MissionDraft = Partial<
  Pick<
    Mission,
    | 'occurred_event'
    | 'status'
    | 'mission_type'
    | 'address_street'
    | 'address_house_number'
    | 'address_object_name'
    | 'address_coordinates'
  >
>;

type Entry = { missionId: string; draft: MissionDraft };

let entries: Entry[] = [];
// Rebuilt on each change, so useSyncExternalStore sees a new snapshot.
let snapshot: ReadonlyMap<string, MissionDraft> = new Map();
const listeners = new Set<() => void>();

function emit() {
  snapshot = new Map(entries.map((e) => [e.missionId, e.draft]));
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

// draft null: nothing unsaved. Pass a memoized draft, as each new one
// re-registers.
export function useRegisterMissionDraft(missionId: string | null, draft: MissionDraft | null) {
  useEffect(() => {
    if (missionId === null || draft === null) return;
    const entry = { missionId, draft };
    entries = [...entries, entry];
    emit();
    return () => {
      entries = entries.filter((e) => e !== entry);
      emit();
    };
  }, [missionId, draft]);
}

const getSnapshot = () => snapshot;

export const useMissionDrafts = () => useSyncExternalStore(subscribe, getSnapshot);
