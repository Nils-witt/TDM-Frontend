import { lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router';
import type { Mission } from '@/api/missions';
import Spinner from '@/components/Spinner';
import SymbolIcon from '@/components/symbols/SymbolIcon';
import { useMissions } from '@/data/missionsContext';
import { responsivePaths } from '../paths';
import styles from './MissionPage.module.scss';

// Lazy, so MUI stays out of the bundle the desktop loads.
const MissionFormMUI = lazy(() =>
  import('../widgets/MissionDetailsMUI/MissionDetailsMUI').then((m) => ({
    default: m.MissionFormMUI,
  })),
);

// The Mission Details form without a mission, which creates one. Once created,
// its page replaces this one, so Back returns to the list rather than to an
// empty form.
function NewMissionPage() {
  const missions = useMissions();
  const navigate = useNavigate();

  const onCreated = async (m: Mission) => {
    await missions.reload();
    void navigate(responsivePaths.mission(m.id), { replace: true });
  };

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <Link to={responsivePaths.missions} className={styles.back}>
          <SymbolIcon name="arrow_back" />
          Missions
        </Link>
      </div>
      <h1 className={styles.title}>New mission</h1>
      <div className={styles.details}>
        <Suspense fallback={<Spinner />}>
          <MissionFormMUI mission={null} onSaved={onCreated} />
        </Suspense>
      </div>
    </div>
  );
}

export default NewMissionPage;
