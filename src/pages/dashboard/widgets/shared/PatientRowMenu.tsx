import { useState } from 'react';
import { useOffline } from '@/api/connectivity';
import { type Patient, patientsApi, uhsBlocker } from '@/api/patients';
import { useHasPermission, useSessionUhs } from '@/app/session';
import { useNow } from '@/app/useNow';
import { LinkOffIcon } from '@/components/icons';
import MenuItem from '@/components/menu/MenuItem';
import { useWidgetWindows } from '@/components/widgetWindow/widgetWindowContext';

// The context menu of a patient row (Patients in Mission, Patients in UHS):
// Open, Assign to UHS (the AssignUhs window) and Remove from UHS. Returns the
// rowMenu of PatientTable and the error of the last removal.
export function usePatientRowMenu() {
  const { openWidget } = useWidgetWindows();
  const offline = useOffline();
  const canEdit = useHasPermission('patients.edit');
  const uhsSession = useSessionUhs() !== null;
  const now = useNow(60_000);
  const [error, setError] = useState<string | null>(null);
  const ctx = { canEdit, offline, now, uhsSession };

  const rowMenu = (p: Patient) => {
    const assign = uhsBlocker(p, ctx, 'assign');
    const release = uhsBlocker(p, ctx, 'release');
    return (
      <>
        <MenuItem onClick={() => openWidget('Patient', { patientId: p.id })}>Open</MenuItem>
        <MenuItem
          disabled={assign !== null}
          title={assign ?? undefined}
          onClick={() => openWidget('AssignUhs', { patientId: p.id })}
        >
          {p.uhs ? 'Move to UHS' : 'Assign to UHS'}
        </MenuItem>
        {p.uhs && (
          <MenuItem
            icon={<LinkOffIcon />}
            disabled={release !== null}
            title={release ?? undefined}
            onClick={() => {
              patientsApi.releaseUhs(p.id).then(
                () => setError(null),
                (err: unknown) => setError((err as Error).message),
              );
            }}
          >
            Remove from {p.uhs.name}
          </MenuItem>
        )}
      </>
    );
  };
  return { rowMenu, error, clearError: () => setError(null) };
}
