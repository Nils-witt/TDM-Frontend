import { useMemo } from 'react';
import { type Mission, type MissionStatus, shortLocation } from '@/api/missions';
import { activeMissionUnitsPath, fetchMissionUnits, type MissionUnit } from '@/api/missionUnits';
import { useResource } from '@/api/resource';
import {
  fmsStatusLabels,
  type FmsTone,
  fmsTone,
  type UnitList,
  unitLabel,
  unitsPath,
} from '@/api/units';
import { useCatalogs } from '@/data/catalogContext';
import { useMission, useMissions } from '@/data/missionsContext';
import { useSelectedScope } from '@/data/selectedScope';
import { useMissionDrafts } from '../MissionDetails/missionDrafts';
import { useUnitScopeMatch } from '../shared/unitScopeFilter';
import { unitSymbolUrl } from '../shared/unitSymbol';
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
// currentScopeOnly leaves out the missions of other scopes than the selected
// one (null = Default).
// With show-unsaved, a mission with unsaved edits in a Mission
// Details form of this window shows them (its position, status and title).
export function useMapMarkers(options: ResolvedOptions, selectedId: string | null) {
  const onlySelected = options['only-selected'] === true;
  const currentScopeOnly = options.currentScopeOnly === true;
  const { matches } = useSelectedScope();
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
      (m.id === selectedId ||
        (!onlySelected &&
          options[`show-${m.status}`] !== false &&
          (!currentScopeOnly || matches(m.scope))))
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
  }, [items, missionTypes, selectedId, options, onlySelected, currentScopeOnly, matches]);

  const selected = markers.find((m) => m.selected);
  return { markers, selected, error };
}

export type UnitMarker = {
  id: string;
  latitude: number;
  longitude: number;
  // Short enough for the marker; title has the rest.
  label: string;
  // The tactical symbol as a data URL; null without one.
  symbol: string | null;
  // The symbol shows the call sign itself.
  symbolNamed: boolean;
  title: string;
  status: number | null;
  tone: FmsTone | null;
  // The mission the unit is on, which a click selects.
  missionId: string | null;
  // On the selected mission.
  selected: boolean;
};

// The tactical code ("12/83-1" of "Rotkreuz Musterstadt 12/83-1") is what the
// radio operators say; without a call sign, the name.
function shortUnitLabel(u: { call_sign: string; name: string }): string {
  return u.call_sign.trim().split(/\s+/).at(-1) || u.name;
}

// The units with a known position, unless show-units is off. only-selected
// keeps those on the selected mission; currentScopeOnly those in the tab's
// unit scope (see useUnitScopeMatch).
export function useMapUnits(options: ResolvedOptions, selectedId: string | null) {
  const enabled = options['show-units'] !== false;
  const onlySelected = options['only-selected'] === true;
  // Neither is loaded while the units are hidden.
  const { data, error } = useResource<UnitList>(enabled ? unitsPath : null);
  const { data: assigned } = useResource<MissionUnit[]>(
    enabled ? activeMissionUnitsPath : null,
    fetchMissionUnits,
  );
  const byUnit = useMemo(
    () => new Map((assigned ?? []).map((a) => [a.unit_id, a.mission])),
    [assigned],
  );
  const scopeMatch = useUnitScopeMatch(options.currentScopeOnly === true);

  const units = useMemo<UnitMarker[]>(() => {
    if (!enabled || !data?.enabled) return [];
    return data.units.flatMap((u) => {
      const p = u.position;
      if (!p) return [];
      const missionId = byUnit.get(u.id) ?? null;
      const selected = missionId !== null && missionId === selectedId;
      if (onlySelected ? !selected : !scopeMatch(u.id)) return [];
      const status = u.status?.code ?? null;
      const lines = [unitLabel(u)];
      if (u.call_sign && u.name !== u.call_sign) lines.push(u.name);
      if (status !== null) lines.push(`${status}: ${fmsStatusLabels[status] ?? ''}`);
      if (p.at) lines.push(`Position ${new Date(p.at).toLocaleString()}`);
      return [
        {
          id: u.id,
          latitude: p.lat,
          longitude: p.lon,
          label: shortUnitLabel(u),
          symbol: unitSymbolUrl(u.symbol, u.tactical_name),
          symbolNamed: !!u.tactical_name,
          title: lines.join('\n'),
          status,
          tone: status === null ? null : fmsTone(status),
          missionId,
          selected,
        },
      ];
    });
  }, [enabled, data, byUnit, selectedId, onlySelected, scopeMatch]);

  return { units, error: enabled && data?.enabled ? error : null };
}
