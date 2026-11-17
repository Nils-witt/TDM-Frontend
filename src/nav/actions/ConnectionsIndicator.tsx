import {
  type ConnectionsLevel,
  type ServiceConnection,
  serviceLabel,
  summarizeConnections,
  useConnections,
} from '@/api/connections';
import { useLive } from '@/api/events';
import { HubIcon } from '@/components/icons.tsx';
import Menu from '@/components/menu/Menu.tsx';
import MenuItem from '@/components/menu/MenuItem.tsx';
import MenuSeparator from '@/components/menu/MenuSeparator.tsx';
import { formatTime } from '@/pages/dashboard/widgets/shared/logbookEntries';
import styles from './ConnectionsIndicator.module.scss';

const levelClass: Record<ConnectionsLevel, string | undefined> = {
  good: styles.good,
  pending: styles.pending,
  degraded: styles.degraded,
  failed: styles.failed,
};

const levelTitle: Record<ConnectionsLevel, string> = {
  good: 'All servers connected',
  pending: 'Checking server connections…',
  degraded: 'Some servers disconnected',
  failed: 'Servers disconnected',
};

// The API's connections to the units server, tile server, address directory
// and Gotenberg. Hidden while the API configures none (or an older API has no
// /api/v1/connections). The states are the API's: the browser never talks to
// these servers itself.
function ConnectionsIndicator() {
  const { data, reload } = useConnections();
  const { live } = useLive();
  const connections = data?.connections ?? [];
  if (connections.length === 0) return null;

  const level = summarizeConnections(connections);
  const title = levelTitle[level];

  return (
    <Menu
      trigger={<HubIcon />}
      className={`${styles.indicator} ${levelClass[level]}`}
      label={title}
      title={title}
    >
      <div className={styles.details}>
        <div className={styles.heading}>{title}</div>
        {!live && (
          <div className={styles.error}>Live updates disconnected: these may be out of date.</div>
        )}
      </div>
      <MenuSeparator />
      <div className={styles.services}>
        {connections.map((c) => (
          <Service key={c.service} connection={c} />
        ))}
      </div>
      <MenuSeparator />
      <MenuItem keepOpen onClick={() => void reload()}>
        Refresh
      </MenuItem>
    </Menu>
  );
}

function Service({ connection: c }: { connection: ServiceConnection }) {
  const since = formatTime(c.since);
  const detail =
    c.state === 'connected'
      ? `Connected since ${since}`
      : c.state === 'pending'
        ? 'Checking…'
        : c.service === 'units'
          ? `Reconnecting since ${since}`
          : `${c.error ?? 'Disconnected'} since ${since}`;
  return (
    <div className={styles.service}>
      <span className={`${styles.dot} ${styles[c.state] ?? ''}`} aria-hidden="true" />
      <span className={styles.name}>{serviceLabel(c.service)}</span>
      <span className={c.state === 'disconnected' ? styles.error : styles.muted}>{detail}</span>
    </div>
  );
}

export default ConnectionsIndicator;
