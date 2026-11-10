import { useState } from 'react';
import ContextMenu from '@/components/menu/ContextMenu';
import MenuItem from '@/components/menu/MenuItem';
import MenuSeparator from '@/components/menu/MenuSeparator';
import type { Point } from '@/components/menu/useContextMenu';
import SymbolIcon from '@/components/symbols/SymbolIcon';
import type { TextKey } from '../MissionDetails/MissionDetails.ts';
import {
  formatDistance,
  type NearbyPlace,
  placeDetail,
  placeLabel,
  useNearbyPlaces,
} from './NearbyPlaces';
import styles from './NearbyPlacesButton.module.scss';

// Beside the coordinates: picks the address of a geo object or house number
// near them, keeping the coordinates.
function NearbyPlacesButton({
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
  const [at, setAt] = useState<Point | null>(null);
  const { state } = nearby;

  const item = (p: NearbyPlace) => (
    <MenuItem
      key={`${p.kind}|${placeLabel(p)}|${p.address.city}|${p.distance}`}
      icon={<SymbolIcon name={p.kind === 'object' ? 'location_on' : 'home'} />}
      trailing={formatDistance(p.distance)}
      onClick={() => nearby.pick(p)}
    >
      {placeLabel(p) || '-/-'}
      {placeDetail(p) && <span className={styles.detail}>{placeDetail(p)}</span>}
    </MenuItem>
  );

  const message = (text: string) => (
    <MenuItem disabled onClick={() => undefined}>
      {text}
    </MenuItem>
  );

  return (
    <>
      <button
        type="button"
        className="btn"
        aria-label="Nearby addresses"
        title={nearby.canOpen ? 'Pick a nearby address' : 'Enter coordinates first'}
        disabled={disabled || !nearby.canOpen}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setAt({ x: r.left, y: r.bottom + 2 });
          nearby.open();
        }}
      >
        <SymbolIcon name="near_me" />
      </button>
      {/* Remounted once loaded, so the first place gets the focus. */}
      <ContextMenu
        key={state?.status}
        at={state === null ? null : at}
        onClose={nearby.close}
        label="Nearby addresses"
      >
        {state?.status === 'loading' && message('Looking up…')}
        {state?.status === 'failed' && message('No address directory available')}
        {state?.status === 'done' && (
          <>
            {state.objects.length === 0 && state.addresses.length === 0 && message('Nothing found')}
            {state.objects.map(item)}
            {state.objects.length > 0 && state.addresses.length > 0 && <MenuSeparator />}
            {state.addresses.map(item)}
          </>
        )}
      </ContextMenu>
    </>
  );
}

export default NearbyPlacesButton;
