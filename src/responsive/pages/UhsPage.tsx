import { lazy, Suspense, useDeferredValue } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useOffline } from '@/api/connectivity';
import { useHasPermission, useSessionUhs } from '@/app/session';
import Alert from '@/components/Alert';
import Spinner from '@/components/Spinner';
import SymbolIcon from '@/components/symbols/SymbolIcon';
import {
  matchesPatient,
  useUhsPatients,
} from '@/pages/dashboard/widgets/UhsPatients/useUhsPatients';
import { responsivePaths } from '../paths';
import styles from './MissionsPage.module.scss';

// Lazy, so MUI stays out of the bundle the desktop loads.
const UhsPatientsMUI = lazy(() => import('../widgets/UhsPatientsMUI/UhsPatientsMUI'));

// The UHS view of an UHS function's session: the patients currently in its
// UHS, newest arrival first, a search (kept in ?q=) and New Patient. Live
// updates come with the patient events. Online only.
function UhsPage() {
  const uhs = useSessionUhs();
  const offline = useOffline();
  const canEdit = useHasPermission('patients.edit');
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const deferred = useDeferredValue(query);
  const navigate = useNavigate();
  const { patients, list } = useUhsPatients(uhs && !offline ? uhs.id : null, 'newest');
  const shown = deferred ? patients.filter((p) => matchesPatient(p, deferred)) : patients;

  if (!uhs) {
    return <p className={styles.empty}>This user function belongs to no UHS.</p>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.headingRow}>
          <h1 className={styles.heading}>{uhs.name}</h1>
          {offline || !canEdit ? (
            <button type="button" className={styles.create} disabled>
              <SymbolIcon name="add" />
              New Patient
            </button>
          ) : (
            <Link to={responsivePaths.uhsNewPatient} className={styles.create}>
              <SymbolIcon name="add" />
              New Patient
            </Link>
          )}
        </div>
        <input
          type="search"
          className={styles.search}
          placeholder="Search patients"
          aria-label="Search patients"
          value={query}
          onChange={(e) =>
            setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })
          }
        />
      </div>
      {offline ? (
        <p className={styles.empty}>Patients are not available offline.</p>
      ) : list.error ? (
        <Alert severity="error">{list.error}</Alert>
      ) : list.data === undefined ? (
        <Spinner />
      ) : shown.length === 0 ? (
        <p className={styles.empty}>
          {query ? 'No patients match the search.' : `No patients in ${uhs.name}.`}
        </p>
      ) : (
        <Suspense fallback={<Spinner />}>
          <UhsPatientsMUI
            patients={shown}
            onOpen={(p) => void navigate(responsivePaths.uhsPatient(p.id))}
          />
        </Suspense>
      )}
    </div>
  );
}

export default UhsPage;
