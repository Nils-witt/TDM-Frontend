import { lastApiAnswer, useOffline } from '@/api/connectivity';
import SymbolIcon from './symbols/SymbolIcon';
import styles from './OfflineBanner.module.scss';

function formatAnswer(t: number): string {
  const d = new Date(t);
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === new Date().toDateString()
    ? time
    : `${d.toLocaleDateString()} ${time}`;
}

// floating: over the dashboard, whose widgets are placed absolutely below the
// menu bar. Otherwise a bar at the top of the scrolling content (/m).
function OfflineBanner({ floating = false }: { floating?: boolean }) {
  const offline = useOffline();
  if (!offline) return null;
  const last = lastApiAnswer();
  return (
    <div role="status" className={`${styles.banner} ${floating ? styles.floating : styles.bar}`}>
      <SymbolIcon name="cloud_off" />
      <span>
        Offline{last !== null && ` · data from ${formatAnswer(last)}`} · changes are disabled
      </span>
    </div>
  );
}

export default OfflineBanner;
