import { useNavigate } from 'react-router';
import { useOffline } from '@/api/connectivity';
import { mobileBasePath, preferDesktop } from '@/app/mobileRoute';
import { useSession } from '@/app/session';
import { useSelectedMission } from '@/data/selectedMissionContext';
import { useWidgetWindows } from '@/components/widgetWindow/widgetWindowContext';
import { useDashboard } from '@/pages/dashboard/dashboardContext';
import {
  saveMission,
  useCanSaveMission,
} from '@/pages/dashboard/widgets/MissionDetails/missionSave';
import { isFinished } from '@/pages/dashboard/widgets/Reports/reportHelpers';
import { useAbout } from './aboutContext';
import { useMissionClose } from './missionCloseContext';
import { useMissionPrint } from './missionPrintContext';

// saveMission saves the open Mission Details form (as its Save button);
// clearMission deselects the selected mission; closeMission asks first;
// printMission asks for the export template of an intermediate report of the
// selected mission, in any status; createReport opens Create Report
// for the selected mission, which must be done or closed; mobileView switches
// to the responsive UI (/m) and stops preferring the desktop one.
export type NavAction =
  | 'about'
  | 'reload'
  | 'mobileView'
  | 'logout'
  | 'saveMission'
  | 'clearMission'
  | 'closeMission'
  | 'printMission'
  | 'createReport';

export function useNavActions() {
  const about = useAbout();
  const { logout } = useSession();
  const { selectedId, update } = useDashboard();
  const { mission } = useSelectedMission();
  const close = useMissionClose();
  const printer = useMissionPrint();
  const canSave = useCanSaveMission();
  const { openWidget } = useWidgetWindows();
  const navigate = useNavigate();
  // Closing and reports write to the API.
  const offline = useOffline();

  const run = (action: NavAction) => {
    switch (action) {
      case 'about':
        about.open();
        break;
      case 'reload':
        window.location.reload();
        break;
      case 'mobileView':
        preferDesktop(false);
        void navigate(mobileBasePath);
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
      case 'printMission':
        if (mission) printer.print(mission);
        break;
      case 'createReport':
        if (mission && isFinished(mission)) openWidget('CreateReport', { missionId: mission.id });
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
        return offline || mission === null || mission.status === 'closed';
      case 'printMission':
        return offline || mission === null;
      case 'createReport':
        return offline || mission === null || !isFinished(mission);
      default:
        return false;
    }
  };

  return { run, disabled };
}
