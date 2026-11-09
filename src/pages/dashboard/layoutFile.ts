import type { Channel, Monitor } from '@/api/layouts';
import type { ActiveLayout } from './layoutContext';

// The version rises when a change makes older builds unable to read the file.
const layoutFileFormat = 'universam.layout';
const layoutFileVersion = 1;

// Without id, scope, owner and timestamps, which belong to the API the layout
// was stored in.
export type LayoutFile = {
  name: string;
  monitors: Monitor[]; // at least one
  channels: Channel[];
};

type LayoutFileJSON = LayoutFile & { format: string; version: number };

function fileName(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return `layout-${base || 'unnamed'}.json`;
}

export function exportLayout(l: ActiveLayout) {
  const file: LayoutFileJSON = {
    format: layoutFileFormat,
    version: layoutFileVersion,
    name: l.name,
    monitors: l.monitors,
    channels: l.channels,
  };
  const blob = new Blob([JSON.stringify(file, null, 2), '\n'], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName(l.name);
  a.click();
  URL.revokeObjectURL(url);
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

// Checks the shape the dashboard relies on.
export function parseLayoutFile(text: string): LayoutFile {
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch {
    throw new Error('The file is not JSON.');
  }
  if (!isObject(v) || v.format !== layoutFileFormat) {
    throw new Error('The file is not an exported layout.');
  }
  if (!isNumber(v.version) || v.version > layoutFileVersion) {
    throw new Error('The layout was exported by a newer version of Universam.');
  }
  const { name, monitors, channels = [] } = v;
  if (typeof name !== 'string') throw new Error('The layout has no name.');
  if (!Array.isArray(monitors) || monitors.length === 0) {
    throw new Error('The layout has no monitors.');
  }
  monitors.forEach((m: unknown, i) => {
    if (
      !isObject(m) ||
      typeof m.id !== 'string' ||
      typeof m.name !== 'string' ||
      !isNumber(m.x) ||
      !isNumber(m.y) ||
      !isNumber(m.width) ||
      !isNumber(m.height) ||
      !Array.isArray(m.widgets) ||
      !m.widgets.every((w) => isObject(w) && typeof w.widget === 'string')
    ) {
      throw new Error(`Monitor ${i + 1} of the layout is invalid.`);
    }
  });
  if (
    !Array.isArray(channels) ||
    !channels.every(
      (c: unknown) =>
        isObject(c) &&
        typeof c.id === 'string' &&
        typeof c.name === 'string' &&
        typeof c.color === 'string' &&
        Array.isArray(c.events) &&
        Array.isArray(c.monitors),
    )
  ) {
    throw new Error('The channels of the layout are invalid.');
  }
  return { name, monitors: monitors as Monitor[], channels: channels as Channel[] };
}
