import { Link, useParams } from 'react-router';
import { shortLocation } from '@/api/missions';
import Alert from '@/components/Alert';
import Spinner from '@/components/Spinner';
import SymbolIcon from '@/components/symbols/SymbolIcon';
import { useMissions } from '@/data/missionsContext';
import { useMissionTypeName } from '@/data/missionTypeName';
import StatusChip from '../StatusChip';
import { responsivePaths } from '../paths';
import styles from './MissionPage.module.scss';

// A placeholder until the mission page gets its own sections (logbook, files…).
function MissionPage() {
  const { id = '' } = useParams();
  const { byId, loading, error } = useMissions();
  const mission = byId.get(id);
  const type = useMissionTypeName(mission?.mission_type ?? null);

  const back = (
    <Link to={responsivePaths.missions} className={styles.back}>
      <SymbolIcon name="arrow_back" />
      Missions
    </Link>
  );

  if (error) return <Alert severity="error">{error}</Alert>;
  if (loading) return <Spinner />;
  if (!mission) {
    return (
      <div className={styles.page}>
        {back}
        <p>This mission does not exist or was deleted.</p>
      </div>
    );
  }

  const address = [
    shortLocation(mission),
    [mission.address_district, mission.address_city].filter(Boolean).join(', '),
  ].filter(Boolean);

  return (
    <div className={styles.page}>
      {back}
      <h1 className={styles.title}>
        {mission.occurred_event || 'Untitled mission'} <StatusChip status={mission.status} />
      </h1>
      <dl className={styles.fields}>
        {type && (
          <>
            <dt>Type</dt>
            <dd>{type}</dd>
          </>
        )}
        {address.length > 0 && (
          <>
            <dt>Location</dt>
            <dd>{address.join(' · ')}</dd>
          </>
        )}
        {mission.callee && (
          <>
            <dt>Caller</dt>
            <dd>
              {mission.callee}
              {mission.callee_phone && (
                <>
                  {' · '}
                  <a href={`tel:${mission.callee_phone}`}>{mission.callee_phone}</a>
                </>
              )}
            </dd>
          </>
        )}
        <dt>Created</dt>
        <dd>
          {new Date(mission.created_at).toLocaleString()} by {mission.created_by}
        </dd>
      </dl>
    </div>
  );
}

export default MissionPage;
