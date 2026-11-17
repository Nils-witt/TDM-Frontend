import { lazy, Suspense, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ApiError } from '@/api/client';
import { useOffline } from '@/api/connectivity';
import {
  formatPatientName,
  isWalkIn,
  patientPath,
  patientsApi,
  usePatient,
  usePatientStays,
} from '@/api/patients';
import { useResourceCache } from '@/api/resource';
import { useHasPermission, useSessionUhs } from '@/app/session';
import Alert from '@/components/Alert';
import Spinner from '@/components/Spinner';
import SymbolIcon from '@/components/symbols/SymbolIcon';
import { responsivePaths } from '../paths';
import styles from './MissionPage.module.scss';

const PatientFormMUI = lazy(() => import('../widgets/UhsPatientsMUI/PatientFormMUI'));
const UhsPatientDetailsMUI = lazy(() => import('../widgets/UhsPatientsMUI/UhsPatientDetailsMUI'));

// One patient of the session's UHS: its fields, its stays and Remove from
// UHS, after which it is out of the session's sight, so the page returns to
// the list. So does a patient removed elsewhere (404).
function UhsPatientPage() {
  const { id = '' } = useParams();
  const uhs = useSessionUhs();
  const offline = useOffline();
  const canEdit = useHasPermission('patients.edit') && !offline;
  const patient = usePatient(offline ? null : id);
  const stays = usePatientStays(offline ? null : id);
  const cache = useResourceCache();
  const navigate = useNavigate();
  // Removed from the UHS elsewhere (or deleted): out of this session's sight.
  const gone = patient.error !== null && patient.data === undefined;
  useEffect(() => {
    if (!gone) return;
    const t = setTimeout(() => void navigate(responsivePaths.uhs, { replace: true }), 2000);
    return () => clearTimeout(t);
  }, [gone, navigate]);

  const back = (
    <div className={styles.toolbar}>
      <Link to={responsivePaths.uhs} className={styles.back}>
        <SymbolIcon name="arrow_back" />
        {uhs?.name ?? 'UHS'}
      </Link>
    </div>
  );

  if (offline) {
    return (
      <div className={styles.page}>
        {back}
        <p>Patients are not available offline.</p>
      </div>
    );
  }
  const p = patient.data;
  if (p === undefined) {
    return (
      <div className={styles.page}>
        {back}
        {gone ? (
          <Alert severity="warning">The patient is no longer in this UHS.</Alert>
        ) : (
          <Spinner />
        )}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {back}
      <h1 className={styles.title}>{formatPatientName(p)}</h1>
      <div className={styles.details}>
        <Suspense fallback={<Spinner />}>
          <PatientFormMUI
            key={`${p.id}-${p.updated_at}`}
            patient={p}
            legend={isWalkIn(p) ? 'Walk-in' : 'Patient'}
            submitLabel="Save"
            disabled={!canEdit}
            onSubmit={async (fields) => {
              const saved = await patientsApi.patch(p, fields);
              cache.put(patientPath(saved.id), saved);
            }}
          />
          <UhsPatientDetailsMUI
            patient={p}
            stays={stays.data ?? []}
            canRemove={canEdit && !!p.uhs}
            onRemove={async () => {
              try {
                await patientsApi.releaseUhs(p.id);
              } catch (err) {
                if (!(err instanceof ApiError && err.status === 404)) throw err;
              }
              void navigate(responsivePaths.uhs, { replace: true });
            }}
          />
        </Suspense>
      </div>
    </div>
  );
}

export default UhsPatientPage;
