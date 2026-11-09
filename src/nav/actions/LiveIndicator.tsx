import { useLive } from '@/api/events';
import { CloudOffIcon } from '@/components/icons.tsx';
import styles from './LiveIndicator.module.scss';

// Shown only while the event stream is disconnected, as the data on screen then
// no longer follows changes made elsewhere. It reconnects by itself.
function LiveIndicator() {
  const { live } = useLive();
  if (live) return null;
  const title = 'Live updates disconnected: reconnecting…';
  return (
    <span className={styles.indicator} role="status" aria-label={title} title={title}>
      <CloudOffIcon />
    </span>
  );
}

export default LiveIndicator;
