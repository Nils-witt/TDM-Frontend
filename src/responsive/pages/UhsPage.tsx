import { lazy, Suspense, useDeferredValue, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useOffline } from '@/api/connectivity';
import { type Patient, patientsApi } from '@/api/patients';
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

const views = [
  { value: 'patients', label: 'Patients' },
  { value: 'inbound', label: 'Inbound' },
] as const;

// The UHS view of an UHS function's session: the patients currently in its
// UHS, newest arrival first, a search (kept in ?q=) and New Patient. Inbound
// (?view=inbound) lists those assigned from a mission and not yet there;
// Arrived records the time and moves them to Patients. Live updates come
// with the patient events. Online only.
function UhsPage() {
  const uhs = useSessionUhs();
  const offline = useOffline();
  const canEdit = useHasPermission('patients.edit');
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const deferred = useDeferredValue(query);
  const navigate = useNavigate();
  const view = params.get('view') === 'inbound' ? 'inbound' : 'patients';
  const { arrived, inbound, list } = useUhsPatients(uhs && !offline ? uhs.id : null, 'newest');
  const inView = view === 'inbound' ? inbound : arrived;
  const shown = deferred ? inView.filter((p) => matchesPatient(p, deferred)) : inView;
  const [arriveError, setArriveError] = useState<string | null>(null);

  const setParam = (key: 'q' | 'view', value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const arrive = async (p: Patient) => {
    try {
      await patientsApi.arriveUhs(p.id);
      setArriveError(null);
      await list.reload();
    } catch (err) {
      setArriveError(err instanceof Error ? err.message : String(err));
    }
  };

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
          onChange={(e) => setParam('q', e.target.value)}
        />
        <div className={styles.filters} role="group" aria-label="View">
          {views.map((v) => {
            const count = v.value === 'inbound' ? inbound.length : arrived.length;
            return (
              <button
                key={v.value}
                type="button"
                className={`${styles.filter}${v.value === view ? ` ${styles.selected}` : ''}`}
                aria-pressed={v.value === view}
                onClick={() => setParam('view', v.value === 'inbound' ? 'inbound' : '')}
              >
                {v.label}
                {list.data !== undefined && ` (${count})`}
              </button>
            );
          })}
        </div>
      </div>
      {arriveError && (
        <Alert severity="error" onClose={() => setArriveError(null)}>
          {arriveError}
        </Alert>
      )}
      {offline ? (
        <p className={styles.empty}>Patients are not available offline.</p>
      ) : list.error ? (
        <Alert severity="error">{list.error}</Alert>
      ) : list.data === undefined ? (
        <Spinner />
      ) : shown.length === 0 ? (
        <p className={styles.empty}>
          {query
            ? 'No patients match the search.'
            : view === 'inbound'
              ? `No patients on their way to ${uhs.name}.`
              : `No patients in ${uhs.name}.`}
        </p>
      ) : (
        <Suspense fallback={<Spinner />}>
          <UhsPatientsMUI
            patients={shown}
            onOpen={(p) => void navigate(responsivePaths.uhsPatient(p.id))}
            onArrive={view === 'inbound' ? arrive : undefined}
            arriveDisabled={!canEdit}
          />
        </Suspense>
      )}
    </div>
  );
}

export default UhsPage;
