// opacity from 0 to 1.
export type OverlayState = { on: boolean; opacity: number };

export const defaultOverlayState: OverlayState = { on: false, opacity: 1 };

// Stored overlay states (widgetState.ts), by overlay ID; invalid entries are
// dropped.
export function parseOverlayStates(v: unknown): Record<string, OverlayState> | undefined {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return undefined;
  return Object.fromEntries(
    Object.entries(v).filter(
      ([, s]) =>
        typeof s === 'object' &&
        s !== null &&
        typeof (s as OverlayState).on === 'boolean' &&
        typeof (s as OverlayState).opacity === 'number' &&
        (s as OverlayState).opacity >= 0 &&
        (s as OverlayState).opacity <= 1,
    ),
  ) as Record<string, OverlayState>;
}
