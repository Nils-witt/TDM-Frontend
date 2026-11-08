import { useSession } from '@/app/session';
import { useAbout } from './aboutContext';

export type NavAction = 'about' | 'reload' | 'logout';

export function useNavActions() {
  const about = useAbout();
  const { logout } = useSession();

  const run = (action: NavAction) => {
    switch (action) {
      case 'about':
        about.open();
        break;
      case 'reload':
        window.location.reload();
        break;
      case 'logout':
        logout?.().catch((err: unknown) =>
          window.alert(`Cannot log out: ${err instanceof Error ? err.message : String(err)}`),
        );
        break;
    }
  };

  const disabled = (action: NavAction) => action === 'logout' && logout === null;

  return { run, disabled };
}
