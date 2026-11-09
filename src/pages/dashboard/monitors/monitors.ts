import type { Monitor } from '@/api/layouts';

// The limit per layout.
export const maxMonitors = 16;

function newMonitorId(monitors: Monitor[]): string {
  for (let i = monitors.length + 1; ; i++) {
    const id = `m${i}`;
    if (!monitors.some((m) => m.id === id)) return id;
  }
}

// Empty, 16:9, right of the others.
export function newMonitor(monitors: Monitor[]): Monitor {
  const right = Math.max(0, ...monitors.map((m) => m.x + m.width));
  return {
    id: newMonitorId(monitors),
    name: `Monitor ${monitors.length + 1}`,
    x: right,
    y: 0,
    width: 16,
    height: 9,
    widgets: [],
  };
}

// Moves the arrangement to start at 0, 0.
export function normalized(monitors: Monitor[]): Monitor[] {
  const minX = Math.min(...monitors.map((m) => m.x));
  const minY = Math.min(...monitors.map((m) => m.y));
  if (minX === 0 && minY === 0) return monitors;
  return monitors.map((m) => ({ ...m, x: m.x - minX, y: m.y - minY }));
}

export const widgetCount = (m: Monitor) =>
  m.widgets.length === 1 ? '1 widget' : `${m.widgets.length} widgets`;

// A pixel position is offset + unit × scale.
export type View = { scale: number; offsetX: number; offsetY: number };

// Centered, leaving pad pixels on each side.
export function fitView(
  monitors: Monitor[],
  area: { width: number; height: number },
  pad: number,
): View {
  if (monitors.length === 0) return { scale: 1, offsetX: pad, offsetY: pad };
  const minX = Math.min(...monitors.map((m) => m.x));
  const minY = Math.min(...monitors.map((m) => m.y));
  const w = Math.max(...monitors.map((m) => m.x + m.width)) - minX;
  const h = Math.max(...monitors.map((m) => m.y + m.height)) - minY;
  const scale = Math.max(1, Math.min((area.width - 2 * pad) / w, (area.height - 2 * pad) / h));
  return {
    scale,
    offsetX: (area.width - w * scale) / 2 - minX * scale,
    offsetY: (area.height - h * scale) / 2 - minY * scale,
  };
}
