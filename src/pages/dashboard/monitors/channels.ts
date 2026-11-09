import type { Channel, ChannelEvent } from '@/api/layouts';

// Each has a --channel-<name> token for light and dark.
const channelColors = [
  'blue',
  'green',
  'orange',
  'purple',
  'teal',
  'pink',
  'brown',
  'indigo',
] as const;

export const channelEvents: { event: ChannelEvent; label: string }[] = [
  { event: 'selection', label: 'Selection' },
];

// The limit per layout.
export const maxChannels = 16;

export const channelColor = (c: Pick<Channel, 'color'>) => `var(--channel-${c.color})`;

// The colors side by side, in equal parts.
export function channelBar(channels: Pick<Channel, 'color'>[]) {
  const n = channels.length;
  const stops = channels.map(
    (c, i) => `${channelColor(c)} ${(i * 100) / n}% ${((i + 1) * 100) / n}%`,
  );
  return `linear-gradient(to right, ${stops.join(', ')})`;
}

// A fresh id, the next palette color, every event and no monitors.
export function newChannel(channels: Channel[]): Channel {
  let n = channels.length + 1;
  while (channels.some((c) => c.id === `c${n}`)) n++;
  const used = new Set(channels.map((c) => c.color));
  const color =
    channelColors.find((c) => !used.has(c)) ??
    channelColors[channels.length % channelColors.length];
  return {
    id: `c${n}`,
    name: `Channel ${n}`,
    color,
    events: channelEvents.map((e) => e.event),
    monitors: [],
  };
}

// In layout order.
export const channelsOf = (channels: Channel[], monitorId: string) =>
  channels.filter((c) => c.monitors.includes(monitorId));

export const setMembership = (
  channels: Channel[],
  monitorId: string,
  channelId: string,
  on: boolean,
) =>
  channels.map((c) => {
    if (c.id !== channelId || c.monitors.includes(monitorId) === on) return c;
    return {
      ...c,
      monitors: on ? [...c.monitors, monitorId] : c.monitors.filter((m) => m !== monitorId),
    };
  });

export const withoutMonitor = (channels: Channel[], monitorId: string) =>
  channels.map((c) =>
    c.monitors.includes(monitorId)
      ? { ...c, monitors: c.monitors.filter((m) => m !== monitorId) }
      : c,
  );
