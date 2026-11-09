import { useState } from 'react';
import { type Coordinates, createMission, type Mission, patchMission } from '@/api/missions';
import type { Point } from '@/components/menu/useContextMenu';
import { useMissions } from '@/data/missionsContext';

// Six decimals are about 10 cm, more than a click can aim.
const round = (v: number) => Math.round(v * 1e6) / 1e6;

export const formatPosition = (p: Coordinates) => `${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}`;

// The map's context menu: create a mission at the clicked position, or move
// the selected one there. A closed mission cannot be moved. The dashboard and
// the responsive UI render it each in their own components.
export function useMapActions(selected: Mission | null, onCreated: (m: Mission) => void) {
  const missions = useMissions();
  const [menu, setMenu] = useState<{ at: Point; position: Coordinates } | null>(null);
  // Where the new mission's dialog creates it.
  const [creating, setCreating] = useState<Coordinates | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = (at: Point, p: Coordinates) =>
    setMenu({ at, position: { lat: round(p.lat), lon: round(p.lon) } });

  const startCreate = () => {
    if (menu) setCreating(menu.position);
    setMenu(null);
  };

  const setLocation = async () => {
    const position = menu?.position;
    setMenu(null);
    if (!selected || !position) return;
    try {
      await patchMission(selected.id, { address_coordinates: position });
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
    const m = await createMission({ occurred_event: occurred, address_coordinates: creating });
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
    create,
    cancelCreate: () => setCreating(null),
    error,
    clearError: () => setError(null),
  };
}
