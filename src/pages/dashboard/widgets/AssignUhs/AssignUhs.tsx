import { useState } from 'react';
import { useOffline } from '@/api/connectivity';
import {
  formatPatientName,
  patientRemovalTexts,
  patientsApi,
  uhsBlocker,
  usePatient,
} from '@/api/patients';
import { useHasPermission, useSessionUhs } from '@/app/session';
import { useNow } from '@/app/useNow';
import { FormError, SectionHeading, SectionText, sectionStack } from '@/components/form';
import RevokeDialog from '@/components/RevokeDialog';
import Spinner from '@/components/Spinner';
import { useCloseWidgetWindow } from '@/components/widgetWindow/widgetWindowContext';
import { useCatalogs } from '@/data/catalogContext';
import tableStyles from '../shared/CatalogManager.module.scss';
import { EmptyState } from '../shared/WidgetStates';
import type { WidgetProps } from '../widgetOptions';

// Window only, opened from a patient row's menu: assigns patientId (fixed
// when opened) to an active UHS of the session's scope, moving it out of its
// current one, or removes it from that. Closes after a change.
function AssignUhs({ options }: WidgetProps) {
  const patientId = String(options.patientId);
  const patient = usePatient(patientId === '' ? null : patientId);
  const { uhs } = useCatalogs();
  const offline = useOffline();
  const canEdit = useHasPermission('patients.edit');
  const uhsSession = useSessionUhs() !== null;
  const now = useNow(60_000);
  const close = useCloseWidgetWindow();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  if (offline) return <EmptyState>Patients are not available offline.</EmptyState>;
  const p = patient.data;
  if (p === undefined) {
    return patient.error === null ? (
      <Spinner compact />
    ) : (
      <EmptyState>The patient was not found.</EmptyState>
    );
  }
  const ctx = { canEdit, offline, now, uhsSession };

  const done = () => {
    setError(null);
    if (close) close();
    else void patient.reload();
  };

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
      done();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const needle = q.trim().toLowerCase();
  const offered = uhs.items
    .filter((u) => u.active && (needle === '' || u.name.toLowerCase().includes(needle)))
    .toSorted((a, b) => a.name.localeCompare(b.name));
  const release = uhsBlocker(p, ctx, 'release');

  return (
    <div className={sectionStack}>
      <div>
        <SectionHeading>UHS for {formatPatientName(p)}</SectionHeading>
        <SectionText>
          {p.uhs ? (
            <>
              In {p.uhs.name}
              {p.uhs.in_scope ? '' : ' (another scope)'} since{' '}
              {new Date(p.uhs.since).toLocaleString()}.{' '}
              <button
                type="button"
                className="btn small"
                disabled={busy || release !== null}
                title={release ?? undefined}
                onClick={() => setRemoving(true)}
              >
                Remove from UHS
              </button>
            </>
          ) : (
            <span className="muted">In no UHS.</span>
          )}
        </SectionText>
        <input
          className="grow"
          type="search"
          placeholder="Filter by name…"
          value={q}
          autoFocus
          onChange={(e) => setQ(e.target.value)}
          aria-label="Filter UHS by name"
        />
      </div>
      {uhs.loading ? (
        <Spinner compact />
      ) : offered.length === 0 ? (
        <EmptyState>No active UHS in this scope.</EmptyState>
      ) : (
        <div className={tableStyles.tableWrap}>
          <table className={tableStyles.table}>
            <tbody>
              {offered.map((u) => {
                const current = p.uhs?.id === u.id;
                const blocked = uhsBlocker(p, ctx, 'assign', u);
                return (
                  <tr key={u.id} className={current ? tableStyles.highlight : undefined}>
                    <td>{u.name}</td>
                    <td className={tableStyles.actions}>
                      <button
                        type="button"
                        className="btn small"
                        disabled={busy || blocked !== null}
                        title={blocked ?? undefined}
                        onClick={() => void run(() => patientsApi.assignUhs(p.id, u.id))}
                      >
                        {current ? 'Current' : p.uhs ? 'Move' : 'Assign'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <FormError error={error ?? patient.error} onClose={() => setError(null)} />
      {removing && p.uhs && (
        <RevokeDialog
          {...patientRemovalTexts.release}
          subject={`${formatPatientName(p)} from ${p.uhs.name}`}
          onRevoke={async (reason) => {
            await patientsApi.releaseUhs(p.id, reason);
            setRemoving(false);
            done();
          }}
          onCancel={() => setRemoving(false)}
        />
      )}
    </div>
  );
}

export default AssignUhs;
