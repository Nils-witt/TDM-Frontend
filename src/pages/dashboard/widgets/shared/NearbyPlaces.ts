import { useCallback, useEffect, useRef, useState } from 'react';
import { addressFields, type NearbyPlace, nearbyPlaces } from '@/api/address';
import type { Coordinates } from '@/api/missions';
import type { TextKey } from '../MissionDetails/MissionDetails.ts';

const limit = 5;

export type { NearbyPlace };

export type NearbyState =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'done'; objects: NearbyPlace[]; addresses: NearbyPlace[] };

const parse = (text: string) => {
  const t = text.trim();
  return t === '' ? NaN : Number(t.replace(',', '.'));
};

// The coordinates as typed, if they make a valid position.
export function typedPosition(lat: string, lon: string): Coordinates | null {
  const p = { lat: parse(lat), lon: parse(lon) };
  return Number.isFinite(p.lat) &&
    Number.isFinite(p.lon) &&
    Math.abs(p.lat) <= 90 &&
    Math.abs(p.lon) <= 180
    ? p
    : null;
}

export const formatDistance = (m: number) =>
  m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;

// The place's address without its object name, as the list shows that
// as the label.
export const placeDetail = (p: NearbyPlace) =>
  [
    p.group,
    [p.address.street, p.address.house_number].filter(Boolean).join(' '),
    [p.postcode, p.address.city].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join(' · ');

export const placeLabel = (p: NearbyPlace) =>
  p.kind === 'object'
    ? p.address.object_name
    : [p.address.street, p.address.house_number].filter(Boolean).join(' ');

// Lists the geo objects and house numbers nearest to the form's coordinates
// to pick one from. Picking fills in the address only: the coordinates stay,
// as they say where the mission is and the place may be some way off. As on
// the map, an address without an object leaves the object name as it is.
export function useNearbyPlaces(lat: string, lon: string, set: (k: TextKey, v: string) => void) {
  const position = typedPosition(lat, lon);
  const [state, setState] = useState<NearbyState | null>(null);
  const ctl = useRef<AbortController | null>(null);

  useEffect(() => () => ctl.current?.abort(), []);

  const open = () => {
    if (position === null) return;
    ctl.current?.abort();
    const current = new AbortController();
    ctl.current = current;
    setState({ status: 'loading' });
    void nearbyPlaces(position, limit, current.signal).then((found) => {
      if (ctl.current !== current) return;
      setState(found === null ? { status: 'failed' } : { status: 'done', ...found });
    });
  };

  // Stable, as ContextMenu re-runs its effect when onClose changes.
  const close = useCallback(() => {
    ctl.current?.abort();
    ctl.current = null;
    setState(null);
  }, []);

  const pick = (p: NearbyPlace) => {
    for (const [k, v] of Object.entries(addressFields(p.address))) set(k as TextKey, v as string);
    close();
  };

  return { canOpen: position !== null, state, open, close, pick };
}
