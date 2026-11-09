import { useCallback, useMemo } from 'react';
import { request } from './client';
import { useCollection } from './collection';
import type { EntityMeta } from './entity';
import { listFetcher } from './list';
import { useResource, useResourceCache } from './resource';
import type { LayoutItem } from '@/pages/dashboard/layout';

const layoutsPath = '/api/v1/layouts';
const preferencesPath = '/api/v1/me/preferences';

// Global layouts are seen by everyone, group layouts by the members of their
// groups; both are written by admins. User layouts exist only for their owner.
export type LayoutScope = 'user' | 'group' | 'global';

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

export type Layout = EntityMeta & {
  id: string;
  name: string;
  scope: LayoutScope;
  owner: string | null; // username; null unless scope is user
  // Group names (as in whoami's groups) a group layout is shared with;
  // empty for the other scopes.
  groups: string[];
  monitors: Monitor[]; // at least one
  channels: Channel[];
};

export type NewLayout = Pick<Layout, 'name' | 'scope' | 'monitors' | 'channels'> &
  Partial<Pick<Layout, 'groups'>>;

// Who sees a layout. Changing it needs the admin group; a scope other than
// group drops the groups.
export type Sharing = Pick<Layout, 'scope' | 'groups'>;

// Changing the scope or groups needs the admin group: a layout made global or
// a group layout loses its owner, one made a user layout becomes the admin's
// own.
export type LayoutUpdate = Partial<
  Pick<Layout, 'name' | 'scope' | 'groups' | 'monitors' | 'channels'>
>;

export type Preferences = {
  // null: the built-in layout.
  default_layout_id: string | null;
};

const layoutPath = (id: string) => `${layoutsPath}/${encodeURIComponent(id)}`;

export const createLayout = (l: NewLayout) =>
  request<Layout>(layoutsPath, { method: 'POST', body: JSON.stringify(l) });

export const updateLayout = (id: string, up: LayoutUpdate) =>
  request<Layout>(layoutPath(id), { method: 'PATCH', body: JSON.stringify(up) });

export const deleteLayout = (id: string) => request<void>(layoutPath(id), { method: 'DELETE' });

const fetchLayouts = listFetcher<Layout>('layouts');

const byScopeAndName = (a: Layout, b: Layout) =>
  Number(a.scope !== 'global') - Number(b.scope !== 'global') ||
  a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

// Global layouts first, then by name. loaded is false until the first load
// answers; a failed load leaves the built-in layout usable.
export function useLayouts(): {
  layouts: Layout[];
  loaded: boolean;
  error: string | null;
  reload: () => Promise<void>;
} {
  const { data, error, reload } = useResource<Layout[]>(layoutsPath, fetchLayouts);
  const layouts = useMemo(() => (data ? [...data].sort(byScopeAndName) : []), [data]);
  return { layouts, loaded: data !== undefined || error !== null, error, reload };
}

// Every user's layouts, for the admin widget (403 for others). Newest first.
export const useAllLayouts = () => useCollection(`${layoutsPath}?all=true`, fetchLayouts);

// The signed-in user's preferences, the same in every browser.
export function usePreferences() {
  const cache = useResourceCache();
  const { data, error } = useResource<Preferences>(preferencesPath);
  const setDefaultLayout = useCallback(
    async (id: string | null) => {
      const saved = await request<Preferences>(preferencesPath, {
        method: 'PATCH',
        body: JSON.stringify({ default_layout_id: id }),
      });
      cache.put(preferencesPath, saved);
    },
    [cache],
  );
  return {
    preferences: data,
    loaded: data !== undefined || error !== null,
    error,
    setDefaultLayout,
  };
}
