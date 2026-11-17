import { useOffline } from '@/api/connectivity';
import { patientPath, patientsApi, usePatient } from '@/api/patients';
import { useResourceCache } from '@/api/resource';
import { useHasPermission } from '@/app/session';
import { FormError } from '@/components/form';
import Spinner from '@/components/Spinner';
import {
  useCloseWidgetWindow,
  useWidgetWindows,
} from '@/components/widgetWindow/widgetWindowContext';
import { useCatalogs } from '@/data/catalogContext';
import { useMission } from '@/data/missionsContext';
import PatientEditor from '../shared/PatientEditor';
import PatientForm from '../shared/PatientForm';
import { EmptyState } from '../shared/WidgetStates';
import type { WidgetProps } from '../widgetOptions';

// Window only, opened by Patients in Mission: patientId edits that patient,
// else a new one is created in missionId, or with uhsId a walk-in in that UHS
// (Patients in UHS). The editor shows the fields only: the lists that open it
// show the UHS, and its row menu assigns one. Once created, the patient opens in
// its own window and this one closes, so the title names what is shown.
function PatientWidget({ options }: WidgetProps) {
  const patientId = String(options.patientId);
  const missionId = String(options.missionId);
  const uhsId = String(options.uhsId ?? '');
  if (patientId !== '') return <EditPatient id={patientId} />;
  if (uhsId !== '') return <NewWalkIn uhsId={uhsId} />;
  return <NewPatient missionId={missionId} />;
}

function NewWalkIn({ uhsId }: { uhsId: string }) {
  const offline = useOffline();
  const canEdit = useHasPermission('patients.edit') && !offline;
  const { uhs } = useCatalogs();
  const target = uhs.byId.get(uhsId);
  const { openWidget } = useWidgetWindows();
  const closeWindow = useCloseWidgetWindow();

  if (offline) return <EmptyState>Patients are not available offline.</EmptyState>;
  if (uhs.loading) return <Spinner compact />;
  if (!target) return <EmptyState>The UHS was not found in this scope.</EmptyState>;
  if (!target.active)
    return <EmptyState>The UHS is inactive: no patients can be added.</EmptyState>;
  if (!canEdit) return <EmptyState>You may not create patients.</EmptyState>;

  return (
    <PatientForm
      patient={null}
      legend={`New walk-in in ${target.name}`}
      submitLabel="Create"
      onSubmit={async (fields) => {
        const p = await patientsApi.create({ ...fields, missions: [], uhs: target.id });
        openWidget('Patient', { patientId: p.id });
        closeWindow?.();
      }}
      onDiscard={closeWindow ?? undefined}
    />
  );
}

function NewPatient({ missionId }: { missionId: string }) {
  const offline = useOffline();
  const canEdit = useHasPermission('patients.edit') && !offline;
  const { mission, loading } = useMission(missionId === '' ? null : missionId);
  const { openWidget } = useWidgetWindows();
  const closeWindow = useCloseWidgetWindow();

  if (offline) return <EmptyState>Patients are not available offline.</EmptyState>;
  if (loading) return <Spinner compact />;
  if (mission === null) return <EmptyState>The mission was not found.</EmptyState>;
  if (mission.status === 'closed') {
    return <EmptyState>The mission is closed: no patients can be added.</EmptyState>;
  }
  if (!canEdit) return <EmptyState>You may not create patients.</EmptyState>;

  return (
    <PatientForm
      patient={null}
      legend={`New patient in ${mission.occurred_event || 'this mission'}`}
      submitLabel="Create"
      onSubmit={async (fields) => {
        const p = await patientsApi.create({ ...fields, missions: [mission.id] });
        openWidget('Patient', { patientId: p.id });
        closeWindow?.();
      }}
      onDiscard={closeWindow ?? undefined}
    />
  );
}

function EditPatient({ id }: { id: string }) {
  const offline = useOffline();
  const canEdit = useHasPermission('patients.edit') && !offline;
  const patient = usePatient(offline ? null : id);
  const cache = useResourceCache();
  const closeWindow = useCloseWidgetWindow();
  const close = () => closeWindow?.();

  if (offline) return <EmptyState>Patients are not available offline.</EmptyState>;
  if (patient.data === undefined) {
    return patient.error === null ? (
      <Spinner compact />
    ) : (
      <FormError error={patient.error} onClose={close} />
    );
  }
  return (
    <PatientEditor
      patient={patient.data}
      readOnly={!canEdit}
      fieldsOnly
      // The answer shows at once; the lists follow on the patients event.
      onChange={(p) => cache.put(patientPath(p.id), p)}
      onDeleted={close}
      onClose={close}
    />
  );
}

export default PatientWidget;
