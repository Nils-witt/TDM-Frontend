import { useOffline } from '@/api/connectivity';
import { formatPatientName, usePatient, usePatientStays } from '@/api/patients';
import { FormError, SectionHeading, sectionStack } from '@/components/form';
import Spinner from '@/components/Spinner';
import { useMission } from '@/data/missionsContext';
import { useDashboard } from '../../dashboardContext';
import tableStyles from '../shared/CatalogManager.module.scss';
import { formatTime } from '../shared/logbookEntries';
import { StatusChip } from '../shared/MissionStatus';
import { StaysTable } from '../shared/PatientStays';
import { EmptyState } from '../shared/WidgetStates';
import type { WidgetProps } from '../widgetOptions';

// Window only, opened from a patient row's menu: the missions of patientId
// (fixed when opened) and its UHS stays, read-only. A mission row selects
// that mission on the dashboard. Online only, like every patient resource.
function PatientHistory({ options }: WidgetProps) {
  const patientId = String(options.patientId ?? '');
  const offline = useOffline();
  const patient = usePatient(offline || patientId === '' ? null : patientId);
  const stays = usePatientStays(offline || patientId === '' ? null : patientId);

  if (offline) return <EmptyState>Patients are not available offline.</EmptyState>;
  const p = patient.data;
  if (p === undefined) {
    return patient.error === null ? (
      <Spinner compact />
    ) : (
      <EmptyState>The patient was not found.</EmptyState>
    );
  }
  const others = p.other_missions ?? [];

  return (
    <div className={sectionStack}>
      <div>
        <SectionHeading>Missions of {formatPatientName(p)}</SectionHeading>
        {p.missions.length + others.length === 0 ? (
          <EmptyState className="">No missions (walk-in).</EmptyState>
        ) : (
          <div className={tableStyles.tableWrap}>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Mission</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {p.missions.map((id) => (
                  <MissionRow key={id} missionId={id} />
                ))}
                {others.map((m) => (
                  <tr key={m.id} title="In another scope: you cannot open it">
                    <td>
                      <span className="muted">{m.name}</span>
                    </td>
                    <td>
                      <span className="muted">Other scope</span>
                    </td>
                    <td />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div>
        <SectionHeading>UHS</SectionHeading>
        {stays.data === undefined ? (
          stays.error === null && <Spinner compact />
        ) : stays.data.length === 0 ? (
          <EmptyState className="">Never in an UHS.</EmptyState>
        ) : (
          <StaysTable stays={stays.data} />
        )}
      </div>
      <FormError error={patient.error ?? stays.error} onClose={() => void stays.reload()} />
    </div>
  );
}

// useMission also finds a mission closed long ago (from the API), which the
// synced missions lack.
function MissionRow({ missionId }: { missionId: string }) {
  const { mission, loading } = useMission(missionId);
  const { update } = useDashboard();
  if (mission === null) {
    return (
      <tr>
        <td colSpan={3} className="muted">
          {loading ? 'Loading…' : missionId}
        </td>
      </tr>
    );
  }
  const select = () => update({ selectedId: mission.id });
  return (
    <tr
      tabIndex={0}
      title="Select this mission"
      onClick={select}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          select();
        }
      }}
    >
      <td>{mission.occurred_event || <span className="muted">Untitled</span>}</td>
      <td>
        <StatusChip status={mission.status} />
      </td>
      <td className={tableStyles.meta}>{formatTime(mission.created_at)}</td>
    </tr>
  );
}

export default PatientHistory;
