import { useSyncExternalStore } from 'react';
import type { LayoutItem } from './layout';

// Layouts are kept in this browser's localStorage; the API has no layout
// endpoints. Every tab of the browser sees the same layouts.
const storageKey = 'universam.layouts';

// Each monitor is shown in its own browser window; x, y, width and height place
// it in the physical arrangement, in abstract grid units.
export type Monitor = {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  widgets: LayoutItem[];
};

export type ChannelEvent = 'selection';

// A group of monitors sharing the events it names, such as the selected
// item. A monitor may be in several channels; color names a color of the
// channel palette.
export type Channel = {
  id: string;
  name: string;
  color: string;
  events: ChannelEvent[];
  monitors: string[]; // monitor ids
};

export type Layout = {
  id: string;
  name: string;
  monitors: Monitor[]; // at least one
  channels: Channel[];
  created_at: string;
  updated_at: string;
};

export type NewLayout = Pick<Layout, 'name' | 'monitors' | 'channels'>;

export type LayoutUpdate = Partial<Pick<Layout, 'name' | 'monitors' | 'channels'>>;

const listeners = new Set<() => void>();
// Parsed once per change of the stored text, so snapshots stay referentially
// stable for useSyncExternalStore.
let cachedRaw: string | null | undefined;
let cached: Layout[] = [];

function readRaw(): string | null {
  try {
    return localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function parse(raw: string | null): Layout[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? (v as Layout[]) : [];
  } catch {
    return [];
  }
}

function snapshot(): Layout[] {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parse(raw);
  }
  return cached;
}

function write(layouts: Layout[]) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(layouts));
  } catch (err) {
    throw new Error(`Cannot store layouts: ${err instanceof Error ? err.message : String(err)}`, {
      cause: err,
    });
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Changes made in other tabs.
  const onStorage = (e: StorageEvent) => {
    if (e.key === storageKey || e.key === null) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

// Async like a server store, so callers do not change if layouts move to the
// API later.
export async function createLayout(l: NewLayout): Promise<Layout> {
  const now = new Date().toISOString();
  const layout: Layout = { ...l, id: crypto.randomUUID(), created_at: now, updated_at: now };
  write([...snapshot(), layout]);
  return layout;
}

export async function updateLayout(id: string, up: LayoutUpdate): Promise<Layout> {
  const layouts = snapshot();
  const current = layouts.find((l) => l.id === id);
  if (!current) throw new Error('The layout no longer exists.');
  const layout = { ...current, ...up, updated_at: new Date().toISOString() };
  write(layouts.map((l) => (l.id === id ? layout : l)));
  return layout;
}

export async function deleteLayout(id: string): Promise<void> {
  write(snapshot().filter((l) => l.id !== id));
}

const noReload = () => Promise.resolve();

export function useLayouts(): { layouts: Layout[]; reload: () => Promise<void> } {
  const layouts = useSyncExternalStore(subscribe, snapshot);
  return { layouts, reload: noReload };
}
