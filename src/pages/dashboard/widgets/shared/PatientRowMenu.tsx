import { useState } from 'react';
import { useOffline } from '@/api/connectivity';
import {
  arriveBlocker,
  formatPatientName,
  isInbound,
  type Patient,
  patientRemovalTexts,
  patientsApi,
  uhsBlocker,
} from '@/api/patients';
import { useHasPermission, useSessionUhs } from '@/app/session';
import { useNow } from '@/app/useNow';
import { LinkOffIcon } from '@/components/icons';
import MenuItem from '@/components/menu/MenuItem';
import RevokeDialog from '@/components/RevokeDialog';
import { useWidgetWindows } from '@/components/widgetWindow/widgetWindowContext';
import PatientHistoryItem from './PatientHistoryItem';

// The context menu of a patient row (Patients in Mission, Patients in UHS,
// Patients): Open, History, Mark as arrived (an inbound patient), Assign to UHS (the AssignUhs
// window) and Remove from UHS, which asks for the reason. Returns the rowMenu of PatientTable, the reason dialog to
// render and the error of the last removal.
export function usePatientRowMenu() {
  const { openWidget } = useWidgetWindows();
  const offline = useOffline();
  const canEdit = useHasPermission('patients.edit');
  const uhsSession = useSessionUhs() !== null;
  const now = useNow(60_000);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Patient | null>(null);
  const ctx = { canEdit, offline, now, uhsSession };

  const rowMenu = (p: Patient) => {
    const assign = uhsBlocker(p, ctx, 'assign');
    const release = uhsBlocker(p, ctx, 'release');
    const arrive = arriveBlocker(p, ctx);
    return (
      <>
        <MenuItem onClick={() => openWidget('Patient', { patientId: p.id })}>Open</MenuItem>
        <PatientHistoryItem patient={p} />
        {isInbound(p) && (
          <MenuItem
            disabled={arrive !== null}
            title={arrive ?? undefined}
            onClick={() => {
              patientsApi.arriveUhs(p.id).then(
                () => setError(null),
                (err: unknown) => setError(err instanceof Error ? err.message : String(err)),
              );
            }}
          >
            Mark as arrived
          </MenuItem>
        )}
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
            onClick={() => setRemoving(p)}
          >
            Remove from {p.uhs.name}
          </MenuItem>
        )}
      </>
    );
  };
  const dialog = removing?.uhs && (
    <RevokeDialog
      {...patientRemovalTexts.release}
      subject={`${formatPatientName(removing)} from ${removing.uhs.name}`}
      onRevoke={async (reason) => {
        await patientsApi.releaseUhs(removing.id, reason);
        setRemoving(null);
        setError(null);
      }}
      onCancel={() => setRemoving(null)}
    />
  );
  return { rowMenu, dialog, error, clearError: () => setError(null) };
}
