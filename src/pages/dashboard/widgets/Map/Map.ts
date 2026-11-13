import { useMemo } from 'react';
import { type Mission, type MissionStatus, shortLocation } from '@/api/missions';
import { useCatalogs } from '@/data/catalogContext';
import { useMission, useMissions } from '@/data/missionsContext';
import { useMissionDrafts } from '../MissionDetails/missionDrafts';
import type { ResolvedOptions } from '../widgetOptions';

export type MapMarker = {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  status: MissionStatus;
  selected: boolean;
  // Shown with a mission form's unsaved edits.
  unsaved: boolean;
};

// Missions with coordinates whose status the options show, plus the selected
// mission whatever its status. The selection is the caller's: the dashboard's
// on the desktop, the URL's in the responsive UI. Closed missions are loaded
// only if shown. only-selected leaves out every mission but the selected one.
// With show-unsaved, a mission with unsaved edits in a Mission
// Details form of this window shows them (its position, status and title).
export function useMapMarkers(options: ResolvedOptions, selectedId: string | null) {
  const onlySelected = options['only-selected'] === true;
  // The selected mission is found by useMission whatever its status.
  const { items: shown, error } = useMissions({
    closed: !onlySelected && options['show-closed'] !== false,
  });
  const { mission: selectedMission } = useMission(selectedId);
  const allDrafts = useMissionDrafts();
  const drafts = options['show-unsaved'] === false ? null : allDrafts;
  const items = useMemo(() => {
    const all =
      selectedMission && !shown.some((m) => m.id === selectedMission.id)
        ? [...shown, selectedMission]
        : shown;
    if (!drafts || drafts.size === 0) return all.map((m) => ({ m, unsaved: false }));
    return all.map((m) => {
      const d = drafts.get(m.id);
      return d ? { m: { ...m, ...d }, unsaved: true } : { m, unsaved: false };
    });
  }, [shown, selectedMission, drafts]);
  const { missionTypes } = useCatalogs();

  const markers = useMemo<MapMarker[]>(() => {
    const title = (m: Mission) => {
      const type = m.mission_type ? missionTypes.byId.get(m.mission_type)?.name : undefined;
      const what = type ? `${type}: ${m.occurred_event}` : m.occurred_event;
      const where = shortLocation(m);
      return where ? `${what}\n${where}` : what;
    };
    return items.flatMap(({ m, unsaved }) =>
      m.address_coordinates !== null &&
      (m.id === selectedId || (!onlySelected && options[`show-${m.status}`] !== false))
        ? [
            {
              id: m.id,
              latitude: m.address_coordinates.lat,
              longitude: m.address_coordinates.lon,
              title: title(m),
              status: m.status,
              selected: m.id === selectedId,
              unsaved,
            },
          ]
        : [],
    );
  }, [items, missionTypes, selectedId, options, onlySelected]);

  const selected = markers.find((m) => m.selected);
  return { markers, selected, error };
}
