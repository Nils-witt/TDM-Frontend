import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useState } from 'react';
import SymbolIcon from '@/components/symbols/SymbolIcon';
import type { TextKey } from '@/pages/dashboard/widgets/MissionDetails/MissionDetails.ts';
import {
  formatDistance,
  type NearbyPlace,
  placeDetail,
  placeLabel,
  useNearbyPlaces,
} from '@/pages/dashboard/widgets/shared/NearbyPlaces';

// As NearbyPlacesButton: picks the address of a nearby geo object or house
// number, keeping the coordinates.
function NearbyPlacesButtonMUI({
  lat,
  lon,
  set,
  disabled,
}: {
  lat: string;
  lon: string;
  set: (k: TextKey, v: string) => void;
  disabled?: boolean;
}) {
  const nearby = useNearbyPlaces(lat, lon, set);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const { state } = nearby;

  const item = (p: NearbyPlace) => (
    <MenuItem
      key={`${p.kind}|${placeLabel(p)}|${p.address.city}|${p.distance}`}
      onClick={() => nearby.pick(p)}
    >
      <ListItemIcon>
        <SymbolIcon name={p.kind === 'object' ? 'location_on' : 'home'} />
      </ListItemIcon>
      <ListItemText
        primary={placeLabel(p) || '-/-'}
        secondary={[placeDetail(p), formatDistance(p.distance)].filter(Boolean).join(' · ')}
      />
    </MenuItem>
  );

  const message = (text: string) => <MenuItem disabled>{text}</MenuItem>;

  return (
    <>
      <IconButton
        aria-label="Nearby addresses"
        title={nearby.canOpen ? 'Pick a nearby address' : 'Enter coordinates first'}
        disabled={disabled || !nearby.canOpen}
        onClick={(e) => {
          setAnchor(e.currentTarget);
          nearby.open();
        }}
        // && beats FieldRowMUI's rule that stretches its children.
        sx={{ '&&': { flex: '0 0 auto' }, alignSelf: 'center' }}
      >
        <SymbolIcon name="near_me" />
      </IconButton>
      <Menu
        open={state !== null && anchor !== null}
        anchorEl={anchor}
        onClose={nearby.close}
        slotProps={{ paper: { sx: { maxWidth: 'min(28rem, calc(100vw - 32px))' } } }}
      >
        {state?.status === 'loading' && message('Looking up…')}
        {state?.status === 'failed' && message('No address directory available')}
        {state?.status === 'done' && [
          state.objects.length === 0 && state.addresses.length === 0 && (
            <MenuItem key="none" disabled>
              Nothing found
            </MenuItem>
          ),
          ...state.objects.map(item),
          state.objects.length > 0 && state.addresses.length > 0 && <Divider key="divider" />,
          ...state.addresses.map(item),
        ]}
      </Menu>
    </>
  );
}

export default NearbyPlacesButtonMUI;
