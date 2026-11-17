import { lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router';
import { useOffline } from '@/api/connectivity';
import { patientsApi } from '@/api/patients';
import { useHasPermission, useSessionUhs } from '@/app/session';
import Spinner from '@/components/Spinner';
import SymbolIcon from '@/components/symbols/SymbolIcon';
import { responsivePaths } from '../paths';
import styles from './MissionPage.module.scss';

const PatientFormMUI = lazy(() => import('../widgets/UhsPatientsMUI/PatientFormMUI'));

// Records a walk-in in the session's UHS. Once created, its page replaces
// this one, so Back returns to the list.
function UhsNewPatientPage() {
  const uhs = useSessionUhs();
  const offline = useOffline();
  const canEdit = useHasPermission('patients.edit');
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <Link to={responsivePaths.uhs} className={styles.back}>
          <SymbolIcon name="arrow_back" />
          {uhs?.name ?? 'UHS'}
        </Link>
      </div>
      <h1 className={styles.title}>New patient</h1>
      {offline ? (
        <p>Patients are not available offline.</p>
      ) : !uhs || !canEdit ? (
        <p>You may not create patients.</p>
      ) : (
        <div className={styles.details}>
          <Suspense fallback={<Spinner />}>
            <PatientFormMUI
              patient={null}
              legend={`Walk-in in ${uhs.name}`}
              submitLabel="Create"
              onSubmit={async (fields) => {
                const p = await patientsApi.create({ ...fields, missions: [], uhs: uhs.id });
                void navigate(responsivePaths.uhsPatient(p.id), { replace: true });
              }}
            />
          </Suspense>
        </div>
      )}
    </div>
  );
}

export default UhsNewPatientPage;
