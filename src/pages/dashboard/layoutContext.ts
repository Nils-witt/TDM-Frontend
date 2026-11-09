import { createContext, use } from 'react';
import type { Channel, Layout, LayoutScope, Monitor, Sharing } from '@/api/layouts';
import { dashboardLayout, type LayoutItem } from './layout';
import type { LayoutFile } from './layoutFile';

// The default layout from dashboard.json, built into the app; it cannot be
// changed.
export const builtinLayoutId = 'builtin';

// A stored layout or the built-in default.
export type ActiveLayout = {
  id: string;
  name: string;
  scope: LayoutScope | 'builtin';
  monitors: Monitor[]; // at least one
  channels: Channel[];
};

export const builtinLayout: ActiveLayout = {
  id: builtinLayoutId,
  name: 'Default',
  scope: 'builtin',
  monitors: [
    {
      id: 'main',
      name: 'Main',
      x: 0,
      y: 0,
      width: 16,
      height: 9,
      widgets: dashboardLayout.widgets,
    },
  ],
  channels: [],
};

export type ArrangementDraft = {
  target: Layout;
  name: string;
  monitors: Monitor[];
  channels: Channel[];
};

export type ArrangementPatch =
  | Partial<Omit<ArrangementDraft, 'target'>>
  | ((draft: ArrangementDraft) => Partial<Omit<ArrangementDraft, 'target'>>);

// The widgets of one monitor being edited. target is null for a new layout;
// channels are copied to a new layout. Only admins can choose the scope.
export type LayoutDraft = {
  target: Layout | null;
  name: string;
  scope: LayoutScope;
  monitors: Monitor[];
  channels: Channel[];
  monitorId: string;
  widgets: LayoutItem[];
};

// The function form is for handlers that do not read the draft themselves.
export type DraftPatch =
  | Partial<Pick<LayoutDraft, 'name' | 'scope' | 'widgets'>>
  | ((draft: LayoutDraft) => Partial<Pick<LayoutDraft, 'name' | 'scope' | 'widgets'>>);

export type LayoutView = {
  layouts: Layout[];
  active: ActiveLayout;
  select: (id: string) => void;
  // monitor is null until this window chose one of a layout with several;
  // the choice is kept per tab, across reloads.
  monitor: Monitor | null;
  chooseMonitor: (id: string | null) => void;
  // channels are the layout's channels of this window's monitor, changed by
  // what this tab connected to or disconnected from (kept per tab, not
  // saved to the layout).
  channels: Channel[];
  setChannelConnected: (channelId: string, on: boolean) => void;
  channelsChanged: boolean;
  resetChannels: () => void;
  // The user's default layout in every browser (from the API), or
  // builtinLayoutId when it names none or one that is gone. setUserDefault
  // rejects with the API's message.
  userDefault: string;
  setUserDefault: (id: string) => Promise<void>;
  canWrite: (scope: LayoutScope) => boolean;
  canEdit: (layout: ActiveLayout) => boolean;
  editing: boolean;
  startEdit: (asNew: boolean) => void;
  startImport: (file: LayoutFile) => void;
  remove: (id: string) => Promise<void>;
  // Admins only: global makes a layout usable by everyone, group by the
  // members of its groups, user makes it the admin's own. Rejects with the
  // API's message.
  setSharing: (id: string, sharing: Sharing) => Promise<void>;
  startArrangementEdit: () => void;
};

export type LayoutDraftState = {
  draft: LayoutDraft | null;
  canUndo: boolean;
  canRedo: boolean;
  // save rejects with the API's message.
  save: () => Promise<void>;
};

export type ArrangementState = {
  arrangement: ArrangementDraft | null;
  // saveArrangement rejects with the API's message.
  saveArrangement: () => Promise<void>;
};

// LayoutActions never change, so using them does not re-render on each
// step of a drag.
export type LayoutActions = {
  // Consecutive changes passing the same group (one drag, say) are a
  // single undo step.
  updateDraft: (patch: DraftPatch, group?: string) => void;
  undo: () => void;
  redo: () => void;
  cancelEdit: () => void;
  updateArrangement: (patch: ArrangementPatch) => void;
  cancelArrangement: () => void;
};

export const LayoutViewContext = createContext<LayoutView | null>(null);
export const LayoutDraftContext = createContext<LayoutDraftState | null>(null);
export const ArrangementContext = createContext<ArrangementState | null>(null);
export const LayoutActionsContext = createContext<LayoutActions | null>(null);

function required<T>(v: T | null, hook: string): T {
  if (!v) throw new Error(`${hook} outside of LayoutProvider`);
  return v;
}

export const useLayoutView = () => required(use(LayoutViewContext), 'useLayoutView');
export const useLayoutDraft = () => required(use(LayoutDraftContext), 'useLayoutDraft');
export const useArrangement = () => required(use(ArrangementContext), 'useArrangement');
export const useLayoutActions = () => required(use(LayoutActionsContext), 'useLayoutActions');
