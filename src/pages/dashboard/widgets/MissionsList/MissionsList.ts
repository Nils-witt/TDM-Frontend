import { useMemo } from 'react';
import { type Mission, missionStatuses } from '@/api/missions';
import { useMissions } from '@/data/missionsContext';
import { useSelectedScope } from '@/data/selectedScope';
import { useDashboard } from '@/pages/dashboard/dashboardContext';

export type MissionSection = { status: string; label: string; missions: Mission[] };

// A section per known status, in lifecycle order and including empty ones, then
// one per status unknown to this build that missions carry.
export function sectionsByStatus(missions: readonly Mission[]): MissionSection[] {
  const sections: MissionSection[] = missionStatuses.map((s) => ({
    status: s.value,
    label: s.label,
    missions: [],
  }));
  const byStatus = new Map(sections.map((s) => [s.status, s]));
  for (const m of missions) {
    let section = byStatus.get(m.status);
    if (!section) {
      section = { status: m.status, label: m.status, missions: [] };
      byStatus.set(m.status, section);
      sections.push(section);
    }
    section.missions.push(m);
  }
  return sections;
}

// `hidden` holds the statuses whose missions, and sections, are left out.
// Closed missions are loaded only if shown. currentScopeOnly leaves out the
// missions of other scopes than the selected one (null = Default).
export function useMissionsListWidget(hidden: readonly string[], currentScopeOnly: boolean) {
  const { items: loaded, error, loading } = useMissions({ closed: !hidden.includes('closed') });
  const { scopeId } = useSelectedScope();
  const all = useMemo(
    () => (currentScopeOnly ? loaded.filter((m) => (m.scope ?? null) === scopeId) : loaded),
    [loaded, currentScopeOnly, scopeId],
  );
  // Keyed by content, as callers pass a new array each render.
  const hiddenKey = hidden.join('\n');
  const hiddenSet = useMemo(
    () => new Set(hiddenKey === '' ? [] : hiddenKey.split('\n')),
    [hiddenKey],
  );
  const missions = useMemo(
    () => (hiddenSet.size === 0 ? all : all.filter((m) => !hiddenSet.has(m.status))),
    [all, hiddenSet],
  );
  const sections = useMemo(
    () => sectionsByStatus(missions).filter((s) => !hiddenSet.has(s.status)),
    [missions, hiddenSet],
  );
  const { selectedId, update } = useDashboard();
  const select = (id: string) => update({ selectedId: id });
  return { missions, sections, error, loading, selectedId, select };
}
