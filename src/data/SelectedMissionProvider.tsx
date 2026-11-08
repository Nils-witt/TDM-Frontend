import type { ReactNode } from 'react';
import { useDashboard } from '@/pages/dashboard/dashboardContext';
import { useMissionData } from './missionData';
import { SelectedMissionContext } from './selectedMissionContext';

// Loaded here once rather than in each widget showing the selected mission.
function SelectedMissionProvider({ children }: { children: ReactNode }) {
  const { selectedId } = useDashboard();
  const data = useMissionData(selectedId);
  return <SelectedMissionContext value={data}>{children}</SelectedMissionContext>;
}

export default SelectedMissionProvider;
