import { useMemo } from 'react';
import { type Mission, type MissionStatus, shortLocation } from '@/api/missions';
import { useCatalogs } from '@/data/catalogContext';
import { useMissions } from '@/data/missionsContext';
import { useDashboard } from '@/pages/dashboard/dashboardContext';
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
// mission whatever its status.
export function useMapWidget(options: ResolvedOptions) {
  const { items, error } = useMissions();
  const { missionTypes } = useCatalogs();
  const { selectedId, update } = useDashboard();

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
  const select = (id: string) => update({ selectedId: id });
  return { markers, selected, select, error };
}
