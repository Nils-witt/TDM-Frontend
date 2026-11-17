import { useState } from 'react';
import { useDebounced } from '@/api/address';
import { useOffline } from '@/api/connectivity';
import { linkBlocker, patientsApi, usePatients } from '@/api/patients';
import { useHasPermission } from '@/app/session';
import { FormError, SectionHeading, sectionStack } from '@/components/form';
import Spinner from '@/components/Spinner';
import { useMission } from '@/data/missionsContext';
import PatientTable from '../shared/PatientTable';
import { EmptyState } from '../shared/WidgetStates';
import type { WidgetProps } from '../widgetOptions';

// Window only, opened by Patients in Mission: finds patients by name to link
// them to missionId, fixed when opened, so a later selection does not move it.
// It stays open, so several can be linked; a linked one shows why it cannot
// be linked again.
function LinkPatient({ options }: WidgetProps) {
  const missionId = String(options.missionId);
  const offline = useOffline();
  const canEdit = useHasPermission('patients.edit') && !offline;
  const { mission, loading } = useMission(missionId === '' ? null : missionId);
  const [q, setQ] = useState('');
  const query = useDebounced(q.trim(), 300);
  const found = usePatients(query === '' || offline ? null : { q: query });
  const [error, setError] = useState<string | null>(null);

  if (offline) return <EmptyState>Patients are not available offline.</EmptyState>;
  if (loading) return <Spinner compact />;
  if (mission === null) return <EmptyState>The mission was not found.</EmptyState>;
  if (mission.status === 'closed') {
    return <EmptyState>The mission is closed: no patients can be linked.</EmptyState>;
  }
  if (!canEdit) return <EmptyState>You may not link patients.</EmptyState>;

  return (
    <div className={sectionStack}>
      <div>
        <SectionHeading>Link to {mission.occurred_event || 'this mission'}</SectionHeading>
        <input
          className="grow"
          type="search"
          placeholder="Search by name…"
          value={q}
          autoFocus
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search patients by name"
        />
      </div>
      {query !== '' &&
        (found.data === undefined ? (
          found.error === null && <Spinner compact />
        ) : found.data.length === 0 ? (
          <EmptyState>No matching patients.</EmptyState>
        ) : (
          <PatientTable
            patients={found.data}
            onPick={() => undefined}
            action={{
              label: 'Link',
              disabled: (p) => linkBlocker(p, mission),
              run: (p) => {
                setError(null);
                patientsApi.link(p.id, mission.id).then(
                  () => void found.reload(),
                  (err: Error) => setError(err.message),
                );
              },
            }}
          />
        ))}
      <FormError error={error ?? found.error} onClose={() => setError(null)} />
    </div>
  );
}

export default LinkPatient;
