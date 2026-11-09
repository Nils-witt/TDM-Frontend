import { createLayout, type Layout } from '@/api/layouts';

// Before the API stored layouts, this browser kept them, and its default
// layout, in localStorage.
const layoutsKey = 'universam.layouts';
const defaultKey = 'universam.dashboard.defaultLayout';

type LocalLayout = Pick<Layout, 'id' | 'name' | 'monitors' | 'channels'>;

function read(): LocalLayout[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(layoutsKey) ?? '[]');
    return Array.isArray(v) ? (v as LocalLayout[]) : [];
  } catch {
    return [];
  }
}

function store(layouts: LocalLayout[]) {
  try {
    if (layouts.length === 0) localStorage.removeItem(layoutsKey);
    else localStorage.setItem(layoutsKey, JSON.stringify(layouts));
  } catch {
    // tried again on the next sign-in
  }
}

function readDefault(): string | null {
  try {
    return localStorage.getItem(defaultKey);
  } catch {
    return null;
  }
}

function forgetDefault() {
  try {
    localStorage.removeItem(defaultKey);
  } catch {
    // ignored once its layout is gone
  }
}

export type Migrated = {
  count: number;
  // The new ID of the layout this browser showed by default, if it was one
  // of them.
  defaultId: string | null;
};

// Shared by every caller, so a remount (StrictMode, say) does not upload the
// layouts twice.
let running: Promise<Migrated> | null = null;

// Uploads this browser's layouts as the user's own and forgets them; one
// that fails stays for the next sign-in.
export function migrateLocalLayouts(): Promise<Migrated> {
  running ??= (async () => {
    const pending = read();
    if (pending.length === 0) return { count: 0, defaultId: null };
    const localDefault = readDefault();
    const left: LocalLayout[] = [];
    let count = 0;
    let defaultId: string | null = null;
    for (const l of pending) {
      try {
        const saved = await createLayout({
          name: l.name,
          scope: 'user',
          monitors: l.monitors,
          channels: l.channels ?? [],
        });
        count++;
        if (l.id === localDefault) defaultId = saved.id;
      } catch {
        left.push(l);
      }
    }
    store(left);
    if (!left.some((l) => l.id === localDefault)) forgetDefault();
    return { count, defaultId };
  })();
  return running;
}
