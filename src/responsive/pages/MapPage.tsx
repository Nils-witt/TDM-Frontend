import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { shortLocation } from '@/api/missions';
import SymbolIcon from '@/components/symbols/SymbolIcon';
import { useMissions } from '@/data/missionsContext';
import { useMissionTypeName } from '@/data/missionTypeName';
import { MissionMap } from '@/pages/dashboard/widgets/Map/Map.tsx';
import { readMapView, saveMapView } from '../mapView';
import { setOverlay, useOverlaySettings } from '../overlaySettings';
import { widgets } from '@/pages/dashboard/widgets/registry';
import { resolveOptions } from '@/pages/dashboard/widgets/widgetOptions';
import StatusChip from '../StatusChip';
import { responsivePaths } from '../paths';
import styles from './MapPage.module.scss';

// The desktop Map widget's defaults: every status, the default style.
const defaults = resolveOptions(widgets.Map?.options, undefined);

// A tap on a pin cannot show its tooltip, so it selects the mission and a card
// names it, with a link to its page.
function MissionCard({ id, onClose }: { id: string; onClose: () => void }) {
  const mission = useMissions().byId.get(id);
  const type = useMissionTypeName(mission?.mission_type ?? null);
  if (!mission) return null;
  const location = [shortLocation(mission), mission.address_city].filter(Boolean).join(', ');
  return (
    <div className={styles.card}>
      <Link to={responsivePaths.mission(mission.id)} className={styles.cardLink}>
        <span className={styles.text}>
          <span className={styles.title}>{mission.occurred_event || 'Untitled mission'}</span>
          {type && <span className={styles.secondary}>{type}</span>}
          {location && <span className={styles.secondary}>{location}</span>}
        </span>
        <StatusChip status={mission.status} />
        <SymbolIcon name="chevron_right" />
      </Link>
      <button type="button" className="icon-btn" aria-label="Close" title="Close" onClick={onClose}>
        <SymbolIcon name="close" />
      </button>
    </div>
  );
}

// The selected mission is kept in the URL (?mission=), so Back from its page
// returns to the map with the card still shown.
function MapPage() {
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('mission');
  // Chosen on the Settings page; the map shows no switcher of its own.
  const overlays = useOverlaySettings();
  const select = (id: string | null) => setParams(id ? { mission: id } : {}, { replace: true });
  // Read once: the map is created with it, and later moves are only saved.
  const [options] = useState(() => ({ ...defaults, ...readMapView() }));

  return (
    <div className={styles.page}>
      <MissionMap
        options={options}
        selectedId={selectedId}
        onSelect={select}
        overlayControl={{ state: overlays, onChange: setOverlay }}
        onViewChange={saveMapView}
      />
      {selectedId && <MissionCard id={selectedId} onClose={() => select(null)} />}
    </div>
  );
}

export default MapPage;
