import { lazy, Suspense } from 'react';
import { Link, useParams } from 'react-router';
import Alert from '@/components/Alert';
import Spinner from '@/components/Spinner';
import SymbolIcon from '@/components/symbols/SymbolIcon';
import { useMissionData } from '@/data/missionData';
import { useMissions } from '@/data/missionsContext';
import { SelectedMissionContext } from '@/data/selectedMissionContext';
import EmbeddedWidget from '../EmbeddedWidget';
import { responsivePaths } from '../paths';
import styles from './MissionPage.module.scss';

// Lazy, so MUI stays out of the bundle the desktop loads.
const MissionFormMUI = lazy(() =>
  import('../widgets/MissionDetailsMUI/MissionDetailsMUI').then((m) => ({
    default: m.MissionFormMUI,
  })),
);

// The Mission Details form, then the Logbook Form and Logbook widgets, all in
// their MUI variants (widgets/).
// The widgets read the selected mission, which here is the one in the URL.
function MissionPage() {
  const { id = '' } = useParams();
  const missions = useMissions();
  const mission = missions.byId.get(id);
  const data = useMissionData(id);

  const back = (
    <Link to={responsivePaths.missions} className={styles.back}>
      <SymbolIcon name="arrow_back" />
      Missions
    </Link>
  );

  if (missions.error) return <Alert severity="error">{missions.error}</Alert>;
  if (missions.loading) return <Spinner />;
  if (!mission) {
    return (
      <div className={styles.page}>
        {back}
        <p>This mission does not exist or was deleted.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        {back}
        {/* Only a mission with a geocoded address has a pin. A push, so Back
            returns here. */}
        {mission.address_coordinates && (
          <Link to={responsivePaths.missionOnMap(mission.id)} className={styles.back}>
            <SymbolIcon name="map" />
            Show on map
          </Link>
        )}
      </div>
      <h1 className={styles.title}>{mission.occurred_event || 'Untitled mission'}</h1>
      {/* Keyed by id so unsaved edits do not carry over to another mission. The
          missions are reloaded after a save, so the list shows the change. */}
      {/* Stacked on narrow screens; on wide ones the mission beside its logbook. */}
      <div className={styles.columns}>
        <div className={styles.details}>
          <Suspense fallback={<Spinner />}>
            <MissionFormMUI key={mission.id} mission={mission} onSaved={() => missions.reload()} />
          </Suspense>
        </div>
        <SelectedMissionContext value={data}>
          {/* Keyed like on the dashboard, so a draft entry stays with its mission. */}
          <div className={styles.widgets} key={mission.id}>
            {/* The mission is named in the heading above already. */}
            <EmbeddedWidget widgetId="LogbookForm" options={{ showMission: false }} />
            {/* Its Create action would open the form shown just above. */}
            <EmbeddedWidget widgetId="Logbook" options={{ showCreate: false }} />
          </div>
        </SelectedMissionContext>
      </div>
    </div>
  );
}

export default MissionPage;
