import { useLive } from '@/api/events';
import { CloudDoneIcon, CloudOffIcon } from '@/components/icons.tsx';
import styles from './LiveIndicator.module.scss';

// While disconnected, the data on screen no longer follows changes made
// elsewhere. The stream reconnects by itself.
function LiveIndicator() {
  const { live } = useLive();
  const title = live ? 'Live updates connected' : 'Live updates disconnected: reconnecting…';
  return (
    <span
      className={`${styles.indicator} ${live ? styles.live : styles.offline}`}
      role="status"
      aria-label={title}
      title={title}
    >
      {live ? <CloudDoneIcon /> : <CloudOffIcon />}
    </span>
  );
}

export default LiveIndicator;
