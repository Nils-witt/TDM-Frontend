import { useOffline } from '@/api/connectivity';
import { usePatients } from '@/api/patients';
import { useHasPermission } from '@/app/session';
import { FormError, sectionStack } from '@/components/form';
import Spinner from '@/components/Spinner';
import { useWidgetWindows } from '@/components/widgetWindow/widgetWindowContext';
import { useSelectedMission } from '@/data/selectedMissionContext';
import { usePatientRowMenu } from '../shared/PatientRowMenu';
import PatientTable from '../shared/PatientTable';
import WidgetActionBar, { WidgetAction } from '../shared/WidgetActionBar';
import { EmptyState, NoMission } from '../shared/WidgetStates';

// The selected mission's patients, closed missions included. Unlike every
// other mission widget, a closed mission's patients stay editable; only their
// links to it are frozen, so a closed mission offers no New or Link. New
// Patient and a row open the Patient widget in a window, Link Existing the
// LinkPatient widget. A row's context menu assigns the patient to an UHS of
// the session's scope or removes it from its UHS.
// Online only: offline there is no local copy.
function MissionPatients() {
  const { mission } = useSelectedMission();
  const offline = useOffline();
  const canEdit = useHasPermission('patients.edit') && !offline;
  const open = mission !== null && mission.status !== 'closed';
  const list = usePatients(mission && !offline ? { mission: mission.id, closed: true } : null);
  const { openWidget } = useWidgetWindows();
  const menu = usePatientRowMenu();

  const actions = (
    <WidgetActionBar label="Patient actions">
      <WidgetAction
        disabled={!open || !canEdit}
        onClick={() => mission && openWidget('Patient', { missionId: mission.id })}
      >
        New Patient
      </WidgetAction>
      <WidgetAction
        disabled={!open || !canEdit}
        onClick={() => mission && openWidget('LinkPatient', { missionId: mission.id })}
      >
        Link Existing
      </WidgetAction>
    </WidgetActionBar>
  );

  if (offline) {
    return <EmptyState>Patients are not available offline.</EmptyState>;
  }
  if (mission === null) {
    return (
      <>
        {actions}
        <NoMission className="mt" />
      </>
    );
  }
  const patients = list.data ?? [];

  return (
    <div className={sectionStack}>
      {actions}
      <div>
        {list.data === undefined && list.error === null ? (
          <Spinner compact />
        ) : patients.length === 0 ? (
          <EmptyState className="">No patients.</EmptyState>
        ) : (
          <PatientTable
            patients={patients}
            showUhs
            rowMenu={menu.rowMenu}
            onPick={(p) => openWidget('Patient', { patientId: p.id })}
          />
        )}
      </div>
      <FormError error={list.error} onClose={() => void list.reload()} />
      <FormError error={menu.error} onClose={menu.clearError} />
      {menu.dialog}
    </div>
  );
}

export default MissionPatients;
