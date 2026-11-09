import { Link, useParams } from 'react-router';
import Alert from '@/components/Alert';
import Spinner from '@/components/Spinner';
import SymbolIcon from '@/components/symbols/SymbolIcon';
import { useMissionData } from '@/data/missionData';
import { useMissions } from '@/data/missionsContext';
import { SelectedMissionContext } from '@/data/selectedMissionContext';
import { MissionForm } from '@/pages/dashboard/widgets/MissionDetails/MissionDetails.tsx';
import EmbeddedWidget from '../EmbeddedWidget';
import { responsivePaths } from '../paths';
import styles from './MissionPage.module.scss';

// The desktop Mission Details form, then the Logbook Form and Logbook widgets.
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
      {back}
      <h1 className={styles.title}>{mission.occurred_event || 'Untitled mission'}</h1>
      {/* Keyed by id so unsaved edits do not carry over to another mission. The
          missions are reloaded after a save, so the list shows the change. */}
      <MissionForm key={mission.id} mission={mission} onSaved={() => missions.reload()} />
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
  );
}

export default MissionPage;
