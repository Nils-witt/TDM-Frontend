import type { CSSProperties } from 'react';
import type { Channel } from '@/api/layouts';
import { LinkIcon, LinkOffIcon } from '@/components/icons.tsx';
import Menu from '@/components/menu/Menu.tsx';
import MenuItem from '@/components/menu/MenuItem.tsx';
import MenuSeparator from '@/components/menu/MenuSeparator.tsx';
import { type ActiveLayout, useLayoutView } from '@/pages/dashboard/layoutContext.ts';
import { channelColor, channelEvents } from '@/pages/dashboard/monitors/channels.ts';
import styles from './ChannelIndicator.module.scss';

// The choice of channels is this window's only and is not saved to the layout.
function ChannelIndicator() {
  const { active, monitor, channels, setChannelConnected, channelsChanged, resetChannels } =
    useLayoutView();
  if (!monitor || active.channels.length === 0) return null;

  const connected = new Set(channels.map((c) => c.id));
  const title =
    channels.length === 0
      ? 'Not connected to a channel'
      : `Connected to ${channels.map((c) => c.name).join(', ')}`;

  return (
    <Menu
      trigger={channels.length > 0 ? <LinkIcon /> : <LinkOffIcon />}
      className={`${styles.indicator}${channels.length === 0 ? ` ${styles.off}` : ''}`}
      label={`Channels: ${title}`}
      title={title}
      tourId="channels"
    >
      {active.channels.map((channel) => {
        const on = connected.has(channel.id);
        return (
          <MenuItem
            key={channel.id}
            icon={
              <span
                className={styles.dot}
                style={{ '--channel': channelColor(channel) } as CSSProperties}
              />
            }
            trailing={
              <span
                className={`${styles.status} ${on ? styles.connected : styles.disconnected}`}
                title={on ? 'Connected' : 'Disconnected'}
              />
            }
            checked={on}
            keepOpen
            title={describe(channel, active, monitor.id)}
            onClick={() => setChannelConnected(channel.id, !on)}
          >
            {channel.name}
          </MenuItem>
        );
      })}
      {channelsChanged && (
        <>
          <MenuSeparator />
          <MenuItem onClick={resetChannels}>Reset to layout channels</MenuItem>
        </>
      )}
    </Menu>
  );
}

// Names the other monitors in the channel and the events it shares with them.
function describe(channel: Channel, active: ActiveLayout, monitorId: string) {
  const others = channel.monitors
    .filter((id) => id !== monitorId)
    .map((id) => active.monitors.find((m) => m.id === id)?.name ?? id);
  const shared = channelEvents
    .filter((e) => channel.events.includes(e.event))
    .map((e) => e.label.toLowerCase());
  if (shared.length === 0) return `${channel.name}: shares no events`;
  return others.length === 0
    ? `${channel.name}: shares ${shared.join(', ')}; no other monitors of the layout`
    : `${channel.name}: shares ${shared.join(', ')} with ${others.join(', ')}`;
}

export default ChannelIndicator;
