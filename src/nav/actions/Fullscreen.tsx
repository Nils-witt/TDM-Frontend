import { useEffect, useState } from 'react';
import { FullscreenExitIcon, FullscreenIcon } from '@/components/icons.tsx';
import styles from './Fullscreen.module.scss';

// Follows the browser's state, so leaving fullscreen with Esc updates it too;
// hidden where the browser has no fullscreen support (e.g. iPhone Safari).
function Fullscreen() {
  const [active, setActive] = useState(() => document.fullscreenElement !== null);

  useEffect(() => {
    const update = () => setActive(document.fullscreenElement !== null);
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);

  if (!document.fullscreenEnabled) return null;

  const toggle = () => {
    const change = active
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen();
    change.catch((err: unknown) => console.warn('fullscreen:', err));
  };

  const label = active ? 'Exit full screen' : 'Enter full screen';
  return (
    <button
      type="button"
      className={styles.fullscreen}
      data-tour="fullscreen"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={toggle}
    >
      {active ? <FullscreenExitIcon /> : <FullscreenIcon />}
    </button>
  );
}

export default Fullscreen;
