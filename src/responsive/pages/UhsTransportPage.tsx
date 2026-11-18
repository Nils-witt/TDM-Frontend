import { lazy, Suspense } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError } from '@/api/client';
import { useOffline } from '@/api/connectivity';
import { formatPatientName, usePatient } from '@/api/patients';
import { useResourceCache } from '@/api/resource';
import { patientTransportPath, transportsApi, usePatientTransport } from '@/api/transports';
import { useHasPermission } from '@/app/session';
import Alert from '@/components/Alert';
import Spinner from '@/components/Spinner';
import SymbolIcon from '@/components/symbols/SymbolIcon';
import { responsivePaths } from '../paths';
import styles from './MissionPage.module.scss';

const TransportDestinationMUI = lazy(
  () => import('../widgets/UhsPatientsMUI/TransportDestinationMUI'),
);

// The newest transport request of a patient of the session's UHS: its
// mission read-only and its destination to fill in. Online only, like the
// patient; once the patient left the UHS it is out of sight (404).
function UhsTransportPage() {
  const { id = '' } = useParams();
  const offline = useOffline();
  const canEdit = useHasPermission('patients.edit') && !offline;
  const patient = usePatient(offline ? null : id);
  const transport = usePatientTransport(offline ? null : id);
  const cache = useResourceCache();

  const back = (
    <div className={styles.toolbar}>
      <Link to={responsivePaths.uhsPatient(id)} className={styles.back}>
        <SymbolIcon name="arrow_back" />
        {patient.data ? formatPatientName(patient.data) : 'Patient'}
      </Link>
    </div>
  );

  if (offline) {
    return (
      <div className={styles.page}>
        {back}
        <p>Transports are not available offline.</p>
      </div>
    );
  }
  const r = transport.data;
  return (
    <div className={styles.page}>
      {back}
      <h1 className={styles.title}>Transport</h1>
      <div className={styles.details}>
        {r === undefined ? (
          transport.error ? (
            <Alert severity="error">{transport.error}</Alert>
          ) : (
            <Spinner />
          )
        ) : r === null ? (
          <p>No transport is requested for this patient.</p>
        ) : (
          <Suspense fallback={<Spinner />}>
            <TransportDestinationMUI
              key={r.id}
              transport={r}
              readOnly={!canEdit}
              onSave={async (fields) => {
                try {
                  cache.put(
                    patientTransportPath(id),
                    await transportsApi.patchDestination(r, fields),
                  );
                } catch (err) {
                  if (err instanceof ApiError && err.status === 412) {
                    await transport.reload();
                    throw new Error(
                      'The mission was changed in the meantime. Check the destination and save again.',
                    );
                  }
                  throw err;
                }
              }}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}

export default UhsTransportPage;
