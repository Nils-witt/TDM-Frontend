import { useEffect, useRef, useState } from 'react';
import { addressFields, formatAddress, type ReverseAddress, reverseGeocode } from '@/api/address';
import { offline } from '@/api/connectivity';
import { type Coordinates, createMission, type Mission, patchMission } from '@/api/missions';
import type { Point } from '@/components/menu/useContextMenu';
import { useMissions } from '@/data/missionsContext';
import { useSelectedScope } from '@/data/selectedScope';

// Six decimals are about 10 cm, more than a click can aim.
const round = (v: number) => Math.round(v * 1e6) / 1e6;

export const formatPosition = (p: Coordinates) => `${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}`;

// The address at p if one was found, else its coordinates.
export const formatPlace = (p: Coordinates, address: ReverseAddress | null | undefined) =>
  address ? `${formatAddress(address)} (${formatPosition(p)})` : formatPosition(p);

// The map's context menu: create a mission at the clicked position, or move
// the selected one there. A closed mission cannot be moved. The position is
// looked up in the address directory as the menu opens, and a nearby geo
// object's name and address, or else a nearby address, is written along with
// the coordinates. The dashboard and
// the responsive UI render it each in their own components. Offline, where
// both actions would fail, it does not open.
export function useMapActions(selected: Mission | null, onCreated: (m: Mission) => void) {
  const missions = useMissions();
  const { scopeId } = useSelectedScope();
  const [menu, setMenu] = useState<{ at: Point; position: Coordinates } | null>(null);
  // Where the new mission's dialog creates it.
  const [creating, setCreating] = useState<Coordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The address at the menu's position; undefined while it is looked up.
  const [address, setAddress] = useState<ReverseAddress | null | undefined>(undefined);
  // Awaited by the actions, so one chosen before the answer still gets it.
  const lookup = useRef<{ result: Promise<ReverseAddress | null>; ctl: AbortController } | null>(
    null,
  );

  useEffect(() => () => lookup.current?.ctl.abort(), []);

  const open = (at: Point, p: Coordinates) => {
    if (offline()) return;
    const position = { lat: round(p.lat), lon: round(p.lon) };
    lookup.current?.ctl.abort();
    const ctl = new AbortController();
    const current = { result: reverseGeocode(position, ctl.signal), ctl };
    lookup.current = current;
    setAddress(undefined);
    void current.result.then((a) => {
      if (lookup.current === current) setAddress(a);
    });
    setMenu({ at, position });
  };

  const foundAddress = async () => (await lookup.current?.result) ?? null;

  const startCreate = () => {
    if (menu) setCreating(menu.position);
    setMenu(null);
  };

  const setLocation = async () => {
    const position = menu?.position;
    setMenu(null);
    if (!selected || !position) return;
    try {
      const a = await foundAddress();
      await patchMission(selected.id, {
        address_coordinates: position,
        ...(a && addressFields(a)),
      });
      await missions.reload();
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // Rejects, so the dialog shows the error.
  const create = async (occurredEvent: string) => {
    if (!creating) return;
    const occurred = occurredEvent.trim();
    if (occurred === '') throw new Error('Enter the occurred event');
    const a = await foundAddress();
    const m = await createMission({
      occurred_event: occurred,
      address_coordinates: creating,
      scope: scopeId,
      ...(a && addressFields(a)),
    });
    await missions.reload();
    setCreating(null);
    onCreated(m);
  };

  return {
    menu,
    open,
    closeMenu: () => setMenu(null),
    canSetLocation: selected !== null && selected.status !== 'closed',
    selectedClosed: selected?.status === 'closed',
    startCreate,
    setLocation,
    creating,
    // Of the menu's position, and so of creating.
    address,
    create,
    cancelCreate: () => setCreating(null),
    error,
    clearError: () => setError(null),
  };
}
