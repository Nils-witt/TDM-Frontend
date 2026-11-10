import Alert from '@mui/material/Alert';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { shortLocation } from '@/api/missions';
import SymbolIcon from '@/components/symbols/SymbolIcon';
import { useMission } from '@/data/missionsContext';
import { useMissionTypeName } from '@/data/missionTypeName';
import { MissionMap } from '@/pages/dashboard/widgets/Map/Map.tsx';
import { formatPlace, useMapActions } from '@/pages/dashboard/widgets/Map/mapActions';
import { NewMissionDialogMUI } from '../widgets/shared/DialogsMUI';
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
  const { mission } = useMission(id);
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
// returns to the map with the card still shown. A long press (or right click)
// offers the dashboard Map's actions; a new mission is selected.
function MapPage() {
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('mission');
  const { mission: selected } = useMission(selectedId);
  // Chosen on the Settings page; the map shows no switcher of its own.
  const overlays = useOverlaySettings();
  const select = (id: string | null) => setParams(id ? { mission: id } : {}, { replace: true });
  // Read once: the map is created with it, and later moves are only saved.
  const [options] = useState(() => ({ ...defaults, ...readMapView() }));
  const actions = useMapActions(selected, (m) => select(m.id));
  // Lifting the finger after a long press may click the menu's backdrop.
  const openedAt = useRef(0);

  return (
    <div className={styles.page}>
      <MissionMap
        options={options}
        selectedId={selectedId}
        onSelect={select}
        overlayControl={{ state: overlays, onChange: setOverlay }}
        onViewChange={saveMapView}
        onContextMenu={(at, p) => {
          openedAt.current = Date.now();
          actions.open(at, p);
        }}
      />
      {actions.error && (
        <Alert severity="error" onClose={actions.clearError} className={styles.error}>
          {actions.error}
        </Alert>
      )}
      {selectedId && <MissionCard id={selectedId} onClose={() => select(null)} />}
      <Menu
        open={actions.menu !== null}
        onClose={(_, reason) => {
          if (reason === 'backdropClick' && Date.now() - openedAt.current < 600) return;
          actions.closeMenu();
        }}
        anchorReference="anchorPosition"
        anchorPosition={
          actions.menu ? { top: actions.menu.at.y, left: actions.menu.at.x } : undefined
        }
      >
        <MenuItem onClick={actions.startCreate}>
          <ListItemIcon>
            <SymbolIcon name="add_location_alt" />
          </ListItemIcon>
          <ListItemText>Create mission here</ListItemText>
        </MenuItem>
        <MenuItem disabled={!actions.canSetLocation} onClick={() => void actions.setLocation()}>
          <ListItemIcon>
            <SymbolIcon name="edit_location_alt" />
          </ListItemIcon>
          <ListItemText
            primary="Set location of selected mission"
            secondary={
              actions.selectedClosed
                ? 'The mission is closed'
                : selected
                  ? selected.occurred_event
                  : 'No mission selected'
            }
          />
        </MenuItem>
      </Menu>
      {actions.creating && (
        <NewMissionDialogMUI
          where={formatPlace(actions.creating, actions.address)}
          onCreate={actions.create}
          onCancel={actions.cancelCreate}
        />
      )}
    </div>
  );
}

export default MapPage;
