import type { ChannelEvent } from '@/pages/dashboard/layoutStore';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DashboardContext, type DashboardState, initialDashboardState } from './dashboardContext';
import { useLayoutView } from './layoutContext';
import { type ChannelBus, openChannelBus } from './monitors/channelBus';

type BusSpec = { id: string; events: ChannelEvent[] };

// The selected item is shared with the windows of the other monitors of each
// channel sharing the selection. A change made here is sent to all of them;
// one taken from a channel is not passed on to the others.
function DashboardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DashboardState>(initialDashboardState);
  const { active, channels } = useLayoutView();
  const buses = useRef<ChannelBus[]>([]);
  // Answered to windows joining a channel.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Renaming or recoloring a channel keeps its bus open: only the ids and
  // events shared reopen the buses.
  const layoutId = active.id;
  const specKey = JSON.stringify(channels.map(({ id, events }) => ({ id, events })));
  const specs = useMemo(() => JSON.parse(specKey) as BusSpec[], [specKey]);
  useEffect(() => {
    const opened = specs.flatMap(({ id, events }) => {
      const b = openChannelBus(layoutId, id, {
        events,
        current: () => ({ selection: stateRef.current.selectedId }),
        onEvent: (event, value) => {
          if (event === 'selection') {
            setState((s) => (s.selectedId === value ? s : { ...s, selectedId: value }));
          }
        },
      });
      return b ? [b] : [];
    });
    buses.current = opened;
    return () => {
      for (const b of opened) b.close();
      buses.current = [];
    };
  }, [layoutId, specs]);

  const update = useCallback((patch: Partial<DashboardState>) => {
    setState((s) => ({ ...s, ...patch }));
    // Only changes made here, not taken from a channel, are sent.
    if ('selectedId' in patch) {
      for (const b of buses.current) b.send('selection', patch.selectedId ?? null);
    }
  }, []);

  const value = useMemo(() => ({ ...state, update }), [state, update]);

  return <DashboardContext value={value}>{children}</DashboardContext>;
}

export default DashboardProvider;
