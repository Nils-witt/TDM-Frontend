import { type ReactNode, useCallback, useMemo, useState } from 'react';
import {
  createLayout,
  deleteLayout,
  type Layout,
  updateLayout,
  useLayouts,
} from '@/pages/dashboard/layoutStore';
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
import type { LayoutItem } from './layout';
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

const localDefaultKey = 'universam.dashboard.defaultLayout';

// Storage may be unavailable; the built-in layout is used then.
function loadLocalDefault(): string | null {
  try {
    return localStorage.getItem(localDefaultKey);
  } catch {
    return null;
  }
}

function storeLocalDefault(id: string | null) {
  try {
    if (id === null) localStorage.removeItem(localDefaultKey);
    else localStorage.setItem(localDefaultKey, id);
  } catch {
    // not remembered
  }
}

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

function LayoutProvider({ children }: { children: ReactNode }) {
  const windowName = useMemo(() => {
    if (window.name == '') {
      window.name = `window-${crypto.randomUUID()}`;
    }
    return window.name;
  }, []);

  const { layouts, reload } = useLayouts();
  // Chosen during this visit; null shows the default.
  const [selected, setSelected] = useState<string | null>(null);
  const [localDefault, setLocal] = useState(loadLocalDefault);
  const [edit, setEdit] = useState<Edit | null>(null);
  const draft = edit?.draft ?? null;
  const [arrangement, setArrangement] = useState<ArrangementDraft | null>(null);
  // Made in this tab during this visit, by layout id; others are read from
  // session storage.
  const [monitorChoices, setMonitorChoices] = useState<Record<string, string | null>>({});
  // Made in this tab during this visit, by layout and monitor id; others are
  // read from session storage.
  const [channelChoices, setChannelChoices] = useState<Record<string, ChannelChoice>>({});

  // A layout that is gone, deleted or not visible falls back to the next
  // one: the selected one, the browser's default, the built-in layout.
  const active: ActiveLayout = useMemo(() => {
    for (const id of [selected, localDefault]) {
      if (id === builtinLayoutId) return builtinLayout;
      const l = id ? layouts.find((l) => l.id === id) : undefined;
      if (l) return l;
    }
    return builtinLayout;
  }, [layouts, selected, localDefault]);

  const select = useCallback((id: string) => setSelected(id), []);

  // A layout with one monitor needs no choice; a chosen monitor that is
  // gone asks again.
  const monitor = useMemo(() => {
    if (active.monitors.length === 1) return active.monitors[0];
    const id =
      active.id in monitorChoices ? monitorChoices[active.id] : loadMonitor(active.id, windowName);
    return active.monitors.find((m) => m.id === id) ?? null;
  }, [active, monitorChoices]);

  const choiceKey = monitor ? `${active.id}.${monitor.id}` : null;
  const channelChoice = useMemo(() => {
    if (!monitor || !choiceKey) return {};
    return choiceKey in channelChoices
      ? channelChoices[choiceKey]
      : loadChannelChoice(windowName, active.id, monitor.id);
  }, [active.id, monitor, choiceKey, channelChoices, windowName]);

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
      storeChannelChoice(windowName, active.id, monitor.id, choice);
      setChannelChoices((c) => ({ ...c, [choiceKey]: choice }));
    },
    [active.id, monitor, choiceKey, windowName],
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
    storeMonitor(layoutId, id, windowName);
    setMonitorChoices((c) => ({ ...c, [layoutId]: id }));
  }, []);

  const chooseMonitor = useCallback(
    (id: string | null) => chooseMonitorOf(active.id, id),
    [active.id, chooseMonitorOf],
  );

  const setLocalDefault = useCallback((id: string | null) => {
    setLocal(id);
    storeLocalDefault(id);
  }, []);

  const canEdit = useCallback((l: ActiveLayout) => !l.builtin, []);

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
          monitors: active.monitors,
          channels: active.channels,
          monitorId: m.id,
          widgets: m.widgets,
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
        monitors: file.monitors,
        channels: file.channels,
        monitorId: m.id,
        widgets: m.widgets,
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
      ? await updateLayout(draft.target.id, { name: draft.name, monitors })
      : await createLayout({
          name: draft.name,
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
      localDefault,
      setLocalDefault,
      canEdit,
      editing,
      startEdit,
      startImport,
      remove,
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
      localDefault,
      setLocalDefault,
      canEdit,
      editing,
      startEdit,
      startImport,
      remove,
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
