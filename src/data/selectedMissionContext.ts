import { createContext, use } from 'react';
import type { MissionData } from './missionData';

export const SelectedMissionContext = createContext<MissionData | null>(null);

// The mission of the dashboard's selection; mission is null when nothing or
// something other than a mission is selected.
export function useSelectedMission(): MissionData {
  const v = use(SelectedMissionContext);
  if (!v) throw new Error('useSelectedMission outside of SelectedMissionProvider');
  return v;
}
