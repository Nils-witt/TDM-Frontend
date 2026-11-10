import { lazy, Suspense } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { mobileBasePath } from '../mobileRoute';
import styles from './UpdatePrompt.module.scss';

// Lazy, so MUI stays out of the desktop's bundle.
const UpdatePromptMUI = lazy(() => import('@/responsive/UpdatePromptMUI'));

export type UpdatePromptViewProps = { onReload: () => void; onDismiss: () => void };

// Mounted above the router, so it also shows on the login page. A new build's
// service worker waits until Reload is chosen, so nothing reloads under an open
// form; dismissed, it takes over once every tab of the app is closed.
function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  const view: UpdatePromptViewProps = {
    onReload: () => void updateServiceWorker(),
    onDismiss: () => setNeedRefresh(false),
  };
  // Read when the update is found; the router lives below this component.
  const responsive = window.location.pathname.startsWith(mobileBasePath);
  return responsive ? (
    <Suspense>
      <UpdatePromptMUI {...view} />
    </Suspense>
  ) : (
    <UpdatePromptDesktop {...view} />
  );
}

function UpdatePromptDesktop({ onReload, onDismiss }: UpdatePromptViewProps) {
  return (
    <div role="status" className={styles.prompt}>
      <span className={styles.message}>A new version of Universam is available.</span>
      <button type="button" className="btn" onClick={onDismiss}>
        Later
      </button>
      <button type="button" className="btn primary" onClick={onReload}>
        Reload
      </button>
    </div>
  );
}

export default UpdatePrompt;
