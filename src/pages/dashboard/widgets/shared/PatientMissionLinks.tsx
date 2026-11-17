import { useId, useState } from 'react';
import { linkBlocker, type Patient, patientsApi, unlinkBlocker } from '@/api/patients';
import { compactControls, FormError, SectionHeading } from '@/components/form';
import { useMissions } from '@/data/missionsContext';
import tableStyles from './CatalogManager.module.scss';
import { StatusChip } from './MissionStatus';

type Props = {
  patient: Patient;
  // Offline or without patients.edit.
  readOnly: boolean;
  // With the API's answer.
  onChange: (p: Patient) => void;
};

// The patient's missions, each unlinked here unless it is the last or closed;
// another open mission is linked from the select below. A mission closed long
// ago is not among the synced ones and shows by its ID.
function PatientMissionLinks({ patient, readOnly, onChange }: Props) {
  const id = useId();
  const missions = useMissions({ closed: true });
  const [pick, setPick] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<Patient>) => {
    setBusy(true);
    try {
      onChange(await fn());
      setError(null);
      setPick('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const linkable = missions.items.filter((m) => linkBlocker(patient, m) === null);

  return (
    <div className={compactControls}>
      <SectionHeading>Missions</SectionHeading>
      <div className={tableStyles.tableWrap}>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <th>Mission</th>
              <th>Status</th>
              <th>
                <span className={tableStyles.hidden}>Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {patient.missions.map((missionId) => {
              const m = missions.byId.get(missionId);
              const blocker = unlinkBlocker(patient, m);
              return (
                <tr key={missionId}>
                  <td>{m ? m.occurred_event : <span className="muted">{missionId}</span>}</td>
                  <td>{m && <StatusChip status={m.status} />}</td>
                  <td>
                    {!readOnly && (
                      <button
                        type="button"
                        className="btn small"
                        disabled={busy || blocker !== null}
                        title={blocker ?? 'Unlink the patient from this mission'}
                        onClick={() => void run(() => patientsApi.unlink(patient.id, missionId))}
                      >
                        Unlink
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <div className="row mt">
          <label htmlFor={`${id}-mission`} className="muted">
            Link to
          </label>
          <select
            id={`${id}-mission`}
            className="grow"
            value={pick}
            onChange={(e) => setPick(e.target.value)}
          >
            <option value="">Choose an open mission…</option>
            {linkable.map((m) => (
              <option key={m.id} value={m.id}>
                {m.occurred_event}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn small primary"
            disabled={busy || pick === ''}
            onClick={() => void run(() => patientsApi.link(patient.id, pick))}
          >
            Link
          </button>
        </div>
      )}
      <FormError error={error} onClose={() => setError(null)} />
    </div>
  );
}

export default PatientMissionLinks;
