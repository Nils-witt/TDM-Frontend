import { useState } from 'react';
import { useOffline } from '@/api/connectivity';
import {
  arriveBlocker,
  formatPatientName,
  isInbound,
  type Patient,
  patientRemovalTexts,
  patientsApi,
  stayArrivalLabel,
  stayEndLabel,
  uhsBlocker,
  type PatientStay,
  usePatientStays,
} from '@/api/patients';
import { useHasPermission, useSessionUhs } from '@/app/session';
import { useNow } from '@/app/useNow';
import { FormError, SectionHeading, SectionText } from '@/components/form';
import RevokeDialog from '@/components/RevokeDialog';
import { useWidgetWindows } from '@/components/widgetWindow/widgetWindowContext';
import tableStyles from './CatalogManager.module.scss';
import { formatTime } from './logbookEntries';

type Props = {
  patient: Patient;
  // With the API's answer.
  onChange: (p: Patient) => void;
};

// The patient's current UHS with Arrived (while inbound), Assign / Remove,
// and every stay below it (from, arrived, to, by whom).
function PatientStays({ patient, onChange }: Props) {
  const stays = usePatientStays(patient.id);
  const { openWidget } = useWidgetWindows();
  const offline = useOffline();
  const canEdit = useHasPermission('patients.edit');
  const uhsSession = useSessionUhs() !== null;
  const now = useNow(60_000);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ctx = { canEdit, offline, now, uhsSession };
  const assign = uhsBlocker(patient, ctx, 'assign');
  const release = uhsBlocker(patient, ctx, 'release');
  const arrive = arriveBlocker(patient, ctx);

  const markArrived = async () => {
    try {
      onChange(await patientsApi.arriveUhs(patient.id));
      setError(null);
      void stays.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const remove = async (reason: string) => {
    onChange(await patientsApi.releaseUhs(patient.id, reason));
    setRemoving(false);
    setError(null);
    void stays.reload();
  };

  const list = stays.data ?? [];
  return (
    <div>
      <SectionHeading>UHS</SectionHeading>
      <SectionText>
        {patient.uhs ? (
          <>
            {isInbound(patient) ? 'Inbound to' : 'In'} {patient.uhs.name}
            {patient.uhs.active ? '' : ' (inactive)'} since {formatTime(patient.uhs.since)}
            {patient.uhs.arrived_at ? `, arrived ${formatTime(patient.uhs.arrived_at)}` : ''}.
          </>
        ) : (
          <span className="muted">In no UHS.</span>
        )}{' '}
        {isInbound(patient) && (
          <button
            type="button"
            className="btn small"
            disabled={arrive !== null}
            title={arrive ?? undefined}
            onClick={() => void markArrived()}
          >
            Arrived
          </button>
        )}{' '}
        {!uhsSession && (
          <button
            type="button"
            className="btn small"
            disabled={assign !== null}
            title={assign ?? undefined}
            onClick={() => openWidget('AssignUhs', { patientId: patient.id })}
          >
            {patient.uhs ? 'Move' : 'Assign to UHS'}
          </button>
        )}{' '}
        {patient.uhs && (
          <button
            type="button"
            className="btn small"
            disabled={release !== null}
            title={release ?? undefined}
            onClick={() => setRemoving(true)}
          >
            Remove from UHS
          </button>
        )}
      </SectionText>
      {list.length > 0 && <StaysTable stays={list} />}
      <FormError error={error ?? stays.error} onClose={() => setError(null)} />
      {removing && patient.uhs && (
        <RevokeDialog
          {...patientRemovalTexts.release}
          subject={`${formatPatientName(patient)} from ${patient.uhs.name}`}
          onRevoke={remove}
          onCancel={() => setRemoving(false)}
        />
      )}
    </div>
  );
}

// Every stay of a patient, newest first: from, arrived, to, by whom and how
// it ended. Also the UHS part of the PatientHistory window.
export function StaysTable({ stays }: { stays: PatientStay[] }) {
  return (
    <div className={tableStyles.tableWrap}>
      <table className={tableStyles.table}>
        <thead>
          <tr>
            <th>UHS</th>
            <th>From</th>
            <th>Arrived</th>
            <th>To</th>
            <th>By</th>
            <th>Ended</th>
          </tr>
        </thead>
        <tbody>
          {stays.map((s) => (
            <tr key={s.id}>
              <td>{s.uhs_name}</td>
              <td className={tableStyles.meta}>{formatTime(s.assigned_at)}</td>
              <td className={tableStyles.meta}>{stayArrivalLabel(s, formatTime)}</td>
              <td className={tableStyles.meta}>
                {s.released_at ? formatTime(s.released_at) : 'now'}
              </td>
              <td className={tableStyles.meta}>{s.created_by}</td>
              <td className={tableStyles.meta}>{stayEndLabel(s)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default PatientStays;
