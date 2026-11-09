import { useSyncExternalStore } from 'react';
import type { OverlayState } from '@/pages/dashboard/widgets/Map/overlayState';

// Set on the Settings page and read by the Map page, which are not mounted at
// the same time, so the choice lives outside React. Kept in this browser
// only: a convenience, not worth an API setting.
const key = 'universam.mapOverlays';

type Overlays = Readonly<Record<string, OverlayState>>;

const listeners = new Set<() => void>();
let current: Overlays = read();

function read(): Overlays {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '{}');
    if (!parsed || typeof parsed !== 'object') return {};
    // Anything not shaped like an OverlayState, from an older version or
    // edited by hand, is dropped.
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([, v]) =>
          typeof v === 'object' &&
          v !== null &&
          typeof (v as OverlayState).on === 'boolean' &&
          typeof (v as OverlayState).opacity === 'number',
      ),
    ) as Overlays;
  } catch {
    return {};
  }
}

export function setOverlay(id: string, state: OverlayState) {
  current = { ...current, [id]: state };
  try {
    localStorage.setItem(key, JSON.stringify(current));
  } catch {
    // Without storage the choice lasts until reload.
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useOverlaySettings(): Overlays {
  return useSyncExternalStore(subscribe, () => current);
}
