import { useMemo } from 'react';
import { type Mission, type MissionStatus, shortLocation } from '@/api/missions';
import { useCatalogs } from '@/data/catalogContext';
import { useMission, useMissions } from '@/data/missionsContext';
import type { ResolvedOptions } from '../widgetOptions';

export type MapMarker = {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  status: MissionStatus;
  selected: boolean;
};

// Missions with coordinates whose status the options show, plus the selected
// mission whatever its status. The selection is the caller's: the dashboard's
// on the desktop, the URL's in the responsive UI. Closed missions are loaded
// only if shown.
export function useMapMarkers(options: ResolvedOptions, selectedId: string | null) {
  const { items: shown, error } = useMissions({ closed: options['show-closed'] !== false });
  const { mission: selectedMission } = useMission(selectedId);
  const items = useMemo(
    () =>
      selectedMission && !shown.some((m) => m.id === selectedMission.id)
        ? [...shown, selectedMission]
        : shown,
    [shown, selectedMission],
  );
  const { missionTypes } = useCatalogs();

  const markers = useMemo<MapMarker[]>(() => {
    const title = (m: Mission) => {
      const type = m.mission_type ? missionTypes.byId.get(m.mission_type)?.name : undefined;
      const what = type ? `${type}: ${m.occurred_event}` : m.occurred_event;
      const where = shortLocation(m);
      return where ? `${what}\n${where}` : what;
    };
    return items.flatMap((m) =>
      m.address_coordinates !== null &&
      (m.id === selectedId || options[`show-${m.status}`] !== false)
        ? [
            {
              id: m.id,
              latitude: m.address_coordinates.lat,
              longitude: m.address_coordinates.lon,
              title: title(m),
              status: m.status,
              selected: m.id === selectedId,
            },
          ]
        : [],
    );
  }, [items, missionTypes, selectedId, options]);

  const selected = markers.find((m) => m.selected);
  return { markers, selected, error };
}
