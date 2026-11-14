import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createLayout,
  deleteLayout,
  type Layout,
  type LayoutScope,
  type Sharing,
  updateLayout,
  useLayouts,
  usePreferences,
} from '@/api/layouts';
import { useIsAdmin } from '@/app/session';
import Spinner from '@/components/Spinner';
import { migrateLocalLayouts } from './localLayouts';
import {
  type ActiveLayout,
  type ArrangementDraft,
  type ArrangementPatch,
  builtinLayout,
  builtinLayoutId,
  type DraftPatch,
  ArrangementContext,
  LayoutActionsContext,
  type LayoutDraft,
  LayoutDraftContext,
  LayoutViewContext,
} from './layoutContext';
import { withItemIds, type LayoutItem } from './layout';
import type { LayoutFile } from './layoutFile';
import { channelsOf } from './monitors/channels';

// group names the change that made the newest past entry: consecutive changes
// of the same group, such as the steps of one drag, are undone together.
type Edit = {
  draft: LayoutDraft;
  past: LayoutItem[][];
  future: LayoutItem[][];
  group: string | null;
};

const historyLimit = 100;

// Session storage is per tab and survives reloads, so each window keeps its
// monitor.
const monitorKey = (layoutId: string, windowName: string) =>
  `universam.dashboard.monitor.${windowName}.${layoutId}`;

function loadMonitor(layoutId: string, windowName: string): string | null {
  try {
    return sessionStorage.getItem(monitorKey(layoutId, windowName));
  } catch {
    return null;
  }
}

function storeMonitor(layoutId: string, monitorId: string | null, windowName: string) {
  try {
    if (monitorId === null) sessionStorage.removeItem(monitorKey(layoutId, windowName));
    else sessionStorage.setItem(monitorKey(layoutId, windowName), monitorId);
  } catch {
    // asked again after a reload
  }
}

// By channel id: connected (true) or disconnected (false), where it differs
// from the layout's membership of the monitor.
type ChannelChoice = Record<string, boolean>;

const channelKey = (windowName: string, layoutId: string, monitorId: string) =>
  `universam.dashboard.channels.${windowName}.${layoutId}.${monitorId}`;

function loadChannelChoice(windowName: string, layoutId: string, monitorId: string): ChannelChoice {
  try {
    const raw = sessionStorage.getItem(channelKey(windowName, layoutId, monitorId));
    const v: unknown = raw ? JSON.parse(raw) : null;
    return v && typeof v === 'object' ? (v as ChannelChoice) : {};
  } catch {
    return {};
  }
}

function storeChannelChoice(
  windowName: string,
  layoutId: string,
  monitorId: string,
  choice: ChannelChoice,
) {
  try {
    const key = channelKey(windowName, layoutId, monitorId);
    if (Object.keys(choice).length === 0) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(choice));
  } catch {
    // the layout's membership applies again after a reload
  }
}

// Names this window's sessionStorage keys. The browser keeps window.name
// across reloads, so a reloaded window finds its monitor and channels again.
let windowNameValue: string | null = null;
function windowName(): string {
  if (windowNameValue === null) {
    if (window.name === '') window.name = `window-${crypto.randomUUID()}`;
    windowNameValue = window.name;
  }
  return windowNameValue;
}

function LayoutProvider({ children }: { children: ReactNode }) {
  const isAdmin = useIsAdmin();
  const { layouts, loaded: layoutsLoaded, reload } = useLayouts();
  const { preferences, loaded: preferencesLoaded, setDefaultLayout } = usePreferences();
  const storedDefault = preferences?.default_layout_id ?? null;
  // One that is gone or not loaded yet is the built-in layout.
  const userDefault =
    storedDefault !== null && layouts.some((l) => l.id === storedDefault)
      ? storedDefault
      : builtinLayoutId;
  // Chosen during this visit; null shows the default.
  const [selected, setSelected] = useState<string | null>(null);
  const [edit, setEdit] = useState<Edit | null>(null);
  const draft = edit?.draft ?? null;
  const [arrangement, setArrangement] = useState<ArrangementDraft | null>(null);
  // Made in this tab during this visit, by layout id; others are read from
  // session storage.
  const [monitorChoices, setMonitorChoices] = useState<Record<string, string | null>>({});
  // Made in this tab during this visit, by layout and monitor id; others are
  // read from session storage.
  const [channelChoices, setChannelChoices] = useState<Record<string, ChannelChoice>>({});

  // Layouts this browser kept before the API stored them become the user's
  // own, once; the browser's default becomes the user's unless one is set.
  const migrated = useRef(false);
  useEffect(() => {
    if (!preferences || migrated.current) return;
    migrated.current = true;
    const hadDefault = preferences.default_layout_id !== null;
    void migrateLocalLayouts().then(async ({ count, defaultId }) => {
      if (count === 0) return;
      await reload();
      if (defaultId && !hadDefault) await setDefaultLayout(defaultId);
    });
  }, [preferences, reload, setDefaultLayout]);

  // A layout that is gone, deleted or not visible falls back to the next
  // one: the selected one, the user's default, the built-in layout.
  const active: ActiveLayout = useMemo(() => {
    for (const id of [selected, userDefault]) {
      if (id === builtinLayoutId) return builtinLayout;
      const l = id ? layouts.find((l) => l.id === id) : undefined;
      if (l) return l;
    }
    return builtinLayout;
  }, [layouts, selected, userDefault]);

  const select = useCallback((id: string) => setSelected(id), []);

  // A layout with one monitor needs no choice; a chosen monitor that is
  // gone asks again.
  const monitor = useMemo(() => {
    if (active.monitors.length === 1) return active.monitors[0] ?? null;
    const id =
      active.id in monitorChoices
        ? monitorChoices[active.id]
        : loadMonitor(active.id, windowName());
    return active.monitors.find((m) => m.id === id) ?? null;
  }, [active, monitorChoices]);

  const choiceKey = monitor ? `${active.id}.${monitor.id}` : null;
  const channelChoice = useMemo(() => {
    if (!monitor || !choiceKey) return {};
    return channelChoices[choiceKey] ?? loadChannelChoice(windowName(), active.id, monitor.id);
  }, [active.id, monitor, choiceKey, channelChoices]);

  // A window is in the channels of its monitor, except those it
  // disconnected from, and in those it connected to.
  const channels = useMemo(() => {
    if (!monitor) return [];
    const member = new Set(channelsOf(active.channels, monitor.id).map((c) => c.id));
    return active.channels.filter((c) => channelChoice[c.id] ?? member.has(c.id));
  }, [active.channels, monitor, channelChoice]);

  const storeChoice = useCallback(
    (choice: ChannelChoice) => {
      if (!monitor || !choiceKey) return;
      storeChannelChoice(windowName(), active.id, monitor.id, choice);
      setChannelChoices((c) => ({ ...c, [choiceKey]: choice }));
    },
    [active.id, monitor, choiceKey],
  );

  const setChannelConnected = useCallback(
    (channelId: string, on: boolean) => {
      const c = active.channels.find((c) => c.id === channelId);
      if (!c || !monitor) return;
      const choice = { ...channelChoice };
      // A choice equal to the layout's membership is dropped, so a later
      // change of the layout applies to this window.
      if (c.monitors.includes(monitor.id) === on) delete choice[channelId];
      else choice[channelId] = on;
      storeChoice(choice);
    },
    [active.channels, monitor, channelChoice, storeChoice],
  );

  // Choices of channels no longer in the layout change nothing.
  const channelsChanged = active.channels.some((c) => c.id in channelChoice);
  const resetChannels = useCallback(() => storeChoice({}), [storeChoice]);

  const chooseMonitorOf = useCallback((layoutId: string, id: string | null) => {
    storeMonitor(layoutId, id, windowName());
    setMonitorChoices((c) => ({ ...c, [layoutId]: id }));
  }, []);

  const chooseMonitor = useCallback(
    (id: string | null) => chooseMonitorOf(active.id, id),
    [active.id, chooseMonitorOf],
  );

  const setUserDefault = useCallback(
    (id: string) => setDefaultLayout(id === builtinLayoutId ? null : id),
    [setDefaultLayout],
  );

  const canWrite = useCallback((scope: LayoutScope) => scope === 'user' || isAdmin, [isAdmin]);

  const canEdit = useCallback(
    (l: ActiveLayout) => l.scope !== 'builtin' && canWrite(l.scope),
    [canWrite],
  );

  const startEdit = useCallback(
    (asNew: boolean) => {
      const target = asNew ? null : (layouts.find((l) => l.id === active.id) ?? null);
      const m = monitor ?? active.monitors[0];
      if ((!asNew && !target) || !m) return;
      setArrangement(null);
      setEdit({
        draft: {
          target,
          name: target ? target.name : `${active.name} copy`,
          scope: target?.scope ?? 'user',
          monitors: active.monitors,
          channels: active.channels,
          monitorId: m.id,
          widgets: withItemIds(m.widgets),
        },
        past: [],
        future: [],
        group: null,
      });
    },
    [layouts, active, monitor],
  );

  const startImport = useCallback((file: LayoutFile) => {
    const m = file.monitors[0];
    if (!m) return;
    setArrangement(null);
    setEdit({
      draft: {
        target: null,
        name: file.name,
        scope: 'user',
        monitors: file.monitors,
        channels: file.channels,
        monitorId: m.id,
        widgets: withItemIds(m.widgets),
      },
      past: [],
      future: [],
      group: null,
    });
  }, []);

  const updateDraft = useCallback((change: DraftPatch, group?: string) => {
    setEdit((e) => {
      if (!e) return e;
      const patch = typeof change === 'function' ? change(e.draft) : change;
      const draft = { ...e.draft, ...patch };
      if (!patch.widgets || patch.widgets === e.draft.widgets) return { ...e, draft };
      if (group !== undefined && group === e.group) return { ...e, draft, future: [] };
      return {
        draft,
        past: [...e.past, e.draft.widgets].slice(-historyLimit),
        future: [],
        group: group ?? null,
      };
    });
  }, []);

  const undo = useCallback(() => {
    setEdit((e) => {
      const prev = e?.past.at(-1);
      if (!e || !prev) return e;
      return {
        draft: { ...e.draft, widgets: prev },
        past: e.past.slice(0, -1),
        future: [e.draft.widgets, ...e.future],
        group: null,
      };
    });
  }, []);

  const redo = useCallback(() => {
    setEdit((e) => {
      const next = e?.future[0];
      if (!e || !next) return e;
      return {
        draft: { ...e.draft, widgets: next },
        past: [...e.past, e.draft.widgets],
        future: e.future.slice(1),
        group: null,
      };
    });
  }, []);

  const canUndo = (edit?.past.length ?? 0) > 0;
  const canRedo = (edit?.future.length ?? 0) > 0;

  const save = useCallback(async () => {
    if (!draft) return;
    const monitors = draft.monitors.map((m) =>
      m.id === draft.monitorId ? { ...m, widgets: draft.widgets } : m,
    );
    const saved: Layout = draft.target
      ? await updateLayout(draft.target.id, {
          name: draft.name,
          monitors,
          ...(draft.scope !== draft.target.scope && { scope: draft.scope }),
        })
      : await createLayout({
          name: draft.name,
          scope: draft.scope,
          monitors,
          channels: draft.channels,
        });
    await reload();
    // This window stays on the monitor it edited, also of a new copy.
    if (monitors.length > 1) chooseMonitorOf(saved.id, draft.monitorId);
    select(saved.id);
    setEdit(null);
  }, [draft, reload, select, chooseMonitorOf]);

  const cancelEdit = useCallback(() => setEdit(null), []);

  const startArrangementEdit = useCallback(() => {
    const target = layouts.find((l) => l.id === active.id);
    if (!target) return;
    setEdit(null);
    setArrangement({
      target,
      name: target.name,
      monitors: target.monitors,
      channels: target.channels,
    });
  }, [layouts, active.id]);

  const updateArrangement = useCallback((change: ArrangementPatch) => {
    setArrangement((a) =>
      a ? { ...a, ...(typeof change === 'function' ? change(a) : change) } : a,
    );
  }, []);

  const saveArrangement = useCallback(async () => {
    if (!arrangement) return;
    const { target, name, monitors, channels } = arrangement;
    const saved = await updateLayout(target.id, { name, monitors, channels });
    await reload();
    select(saved.id);
    setArrangement(null);
  }, [arrangement, reload, select]);

  const cancelArrangement = useCallback(() => setArrangement(null), []);

  const remove = useCallback(
    async (id: string) => {
      await deleteLayout(id);
      await reload();
    },
    [reload],
  );

  const setSharing = useCallback(
    async (id: string, sharing: Sharing) => {
      await updateLayout(id, sharing);
      await reload();
    },
    [reload],
  );

  const editing = edit !== null || arrangement !== null;

  const view = useMemo(
    () => ({
      layouts,
      active,
      select,
      monitor,
      chooseMonitor,
      channels,
      setChannelConnected,
      channelsChanged,
      resetChannels,
      userDefault,
      setUserDefault,
      canWrite,
      canEdit,
      editing,
      startEdit,
      startImport,
      remove,
      setSharing,
      startArrangementEdit,
    }),
    [
      layouts,
      active,
      select,
      monitor,
      chooseMonitor,
      channels,
      setChannelConnected,
      channelsChanged,
      resetChannels,
      userDefault,
      setUserDefault,
      canWrite,
      canEdit,
      editing,
      startEdit,
      startImport,
      remove,
      setSharing,
      startArrangementEdit,
    ],
  );

  const draftState = useMemo(
    () => ({ draft, canUndo, canRedo, save }),
    [draft, canUndo, canRedo, save],
  );

  const arrangementState = useMemo(
    () => ({ arrangement, saveArrangement }),
    [arrangement, saveArrangement],
  );

  const actions = useMemo(
    () => ({ updateDraft, undo, redo, cancelEdit, updateArrangement, cancelArrangement }),
    [updateDraft, undo, redo, cancelEdit, updateArrangement, cancelArrangement],
  );

  // Waits for the user's default rather than showing the built-in layout
  // first; a failed load shows the built-in one.
  if (!layoutsLoaded || !preferencesLoaded) return <Spinner />;

  return (
    <LayoutActionsContext value={actions}>
      <LayoutViewContext value={view}>
        <LayoutDraftContext value={draftState}>
          <ArrangementContext value={arrangementState}>{children}</ArrangementContext>
        </LayoutDraftContext>
      </LayoutViewContext>
    </LayoutActionsContext>
  );
}

export default LayoutProvider;
