import { useState } from 'react';
import { useOffline } from '@/api/connectivity';
import { type Patient, patientsApi, uhsBlocker, usePatientStays } from '@/api/patients';
import { useHasPermission, useSessionUhs } from '@/app/session';
import { useNow } from '@/app/useNow';
import { FormError, SectionHeading, SectionText } from '@/components/form';
import { useWidgetWindows } from '@/components/widgetWindow/widgetWindowContext';
import tableStyles from './CatalogManager.module.scss';
import { formatTime } from './logbookEntries';

type Props = {
  patient: Patient;
  // With the API's answer.
  onChange: (p: Patient) => void;
};

// The patient's current UHS with Assign / Remove, and every stay below it
// (from, to, by whom).
function PatientStays({ patient, onChange }: Props) {
  const stays = usePatientStays(patient.id);
  const { openWidget } = useWidgetWindows();
  const offline = useOffline();
  const canEdit = useHasPermission('patients.edit');
  const uhsSession = useSessionUhs() !== null;
  const now = useNow(60_000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ctx = { canEdit, offline, now, uhsSession };
  const assign = uhsBlocker(patient, ctx, 'assign');
  const release = uhsBlocker(patient, ctx, 'release');

  const remove = async () => {
    setBusy(true);
    try {
      onChange(await patientsApi.releaseUhs(patient.id));
      setError(null);
      void stays.reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const list = stays.data ?? [];
  return (
    <div>
      <SectionHeading>UHS</SectionHeading>
      <SectionText>
        {patient.uhs ? (
          <>
            In {patient.uhs.name}
            {patient.uhs.active ? '' : ' (inactive)'} since {formatTime(patient.uhs.since)}.
          </>
        ) : (
          <span className="muted">In no UHS.</span>
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
            disabled={busy || release !== null}
            title={release ?? undefined}
            onClick={() => void remove()}
          >
            Remove from UHS
          </button>
        )}
      </SectionText>
      {list.length > 0 && (
        <div className={tableStyles.tableWrap}>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>UHS</th>
                <th>From</th>
                <th>To</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id}>
                  <td>{s.uhs_name}</td>
                  <td className={tableStyles.meta}>{formatTime(s.assigned_at)}</td>
                  <td className={tableStyles.meta}>
                    {s.released_at ? formatTime(s.released_at) : 'now'}
                  </td>
                  <td className={tableStyles.meta}>{s.created_by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <FormError error={error ?? stays.error} onClose={() => setError(null)} />
    </div>
  );
}

export default PatientStays;
