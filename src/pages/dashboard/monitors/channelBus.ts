import type { ChannelEvent } from '@/api/layouts';

type ChannelState = { selection: string | null };

// A window that opens sends hello; every window that knows the channel's state
// answers with state. event shares a change.
type ChannelMessage =
  | { type: 'hello' }
  | { type: 'state'; state: Partial<ChannelState> }
  | { type: 'event'; event: ChannelEvent; value: string | null };

// Connects the windows of one channel of a layout in this browser.
export type ChannelBus = {
  send: <E extends ChannelEvent>(event: E, value: ChannelState[E]) => void;
  close: () => void;
};

type Options = {
  // Others are neither sent nor taken.
  events: ChannelEvent[];
  // Answered to windows that open.
  current: () => ChannelState;
  // A change made in another window, or the channel's state on opening.
  onEvent: <E extends ChannelEvent>(event: E, value: ChannelState[E]) => void;
};

const channelName = (layoutId: string, channelId: string) =>
  `universam.layout-channel.${layoutId}.${channelId}`;

// Asks the other windows for the state. null without BroadcastChannel; the
// window then works on its own.
export function openChannelBus(
  layoutId: string,
  channelId: string,
  { events, current, onEvent }: Options,
): ChannelBus | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  const bc = new BroadcastChannel(channelName(layoutId, channelId));
  const shared = new Set(events);
  // known is whether this window knows the channel's state: it got the
  // state from another window, or an event was sent or taken. A window
  // that does not know it does not answer hello, so it never passes on
  // its own empty state as the channel's.
  let known = false;
  // Only the first answer is taken.
  let stated = false;

  const post = (m: ChannelMessage) => bc.postMessage(m);

  bc.onmessage = (e: MessageEvent<ChannelMessage>) => {
    const m = e.data;
    switch (m?.type) {
      case 'hello': {
        if (!known) return;
        const now = current();
        const state: Partial<ChannelState> = {};
        for (const ev of shared) state[ev] = now[ev];
        post({ type: 'state', state });
        return;
      }
      case 'state':
        // A change made here already, or an earlier answer, wins.
        if (known || stated) return;
        stated = true;
        known = true;
        for (const ev of shared) if (ev in m.state) onEvent(ev, m.state[ev] ?? null);
        return;
      case 'event':
        if (!shared.has(m.event)) return;
        known = true;
        onEvent(m.event, m.value);
        return;
    }
  };

  post({ type: 'hello' });

  return {
    send: (event, value) => {
      if (!shared.has(event)) return;
      known = true;
      post({ type: 'event', event, value });
    },
    close: () => bc.close(),
  };
}
