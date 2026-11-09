import { useSession } from '@/app/session';
import { useSelectedMission } from '@/data/selectedMissionContext';
import { useDashboard } from '@/pages/dashboard/dashboardContext';
import {
  saveMission,
  useCanSaveMission,
} from '@/pages/dashboard/widgets/MissionDetails/missionSave';
import { useAbout } from './aboutContext';
import { useMissionClose } from './missionCloseContext';

// saveMission saves the open Mission Details form (as its Save button);
// clearMission deselects the selected mission; closeMission asks first.
export type NavAction =
  'about' | 'reload' | 'logout' | 'saveMission' | 'clearMission' | 'closeMission';

export function useNavActions() {
  const about = useAbout();
  const { logout } = useSession();
  const { selectedId, update } = useDashboard();
  const { mission } = useSelectedMission();
  const close = useMissionClose();
  const canSave = useCanSaveMission();

  const run = (action: NavAction) => {
    switch (action) {
      case 'about':
        about.open();
        break;
      case 'reload':
        window.location.reload();
        break;
      case 'logout':
        logout().catch((err: unknown) =>
          window.alert(`Cannot log out: ${err instanceof Error ? err.message : String(err)}`),
        );
        break;
      case 'saveMission':
        saveMission();
        break;
      case 'clearMission':
        update({ selectedId: null });
        break;
      case 'closeMission':
        if (mission) close.confirm(mission);
        break;
    }
  };

  const disabled = (action: NavAction) => {
    switch (action) {
      case 'saveMission':
        return !canSave;
      case 'clearMission':
        return selectedId === null;
      case 'closeMission':
        return mission === null || mission.status === 'closed';
      default:
        return false;
    }
  };

  return { run, disabled };
}
