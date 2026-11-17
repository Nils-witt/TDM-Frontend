export const minZoom = 0;
export const maxZoom = 22;

// Stored selection zoom (widgetState.ts); anything else is dropped.
export function parseZoom(v: unknown): number | undefined {
  return typeof v === 'number' && v >= minZoom && v <= maxZoom ? v : undefined;
}
