import { useNavigate } from 'react-router';
import { displayName, useSession } from '@/app/session';
import { preferDesktop } from '@/app/mobileRoute';
import SymbolIcon from '@/components/symbols/SymbolIcon';
import { useNavActions } from '@/nav/navActions';
import WidgetScreen from './WidgetScreen';
import styles from './MobileLayout.module.scss';

// The account and app items of the desktop menus; no admin functions, layouts
// or reports.
function MoreScreen() {
  const { principal } = useSession();
  const { run } = useNavActions();
  const navigate = useNavigate();
  const desktop = () => {
    preferDesktop(true);
    void navigate('/');
  };
  return (
    <WidgetScreen
      widgetId="ActiveMissions"
      before={
        <ul className={styles.list}>
          <li>
            <button type="button" onClick={() => run('about')}>
              <SymbolIcon name="account_circle" />
              <span>{displayName(principal)}</span>
            </button>
          </li>
          <li>
            <button type="button" onClick={() => run('reload')}>
              <SymbolIcon name="refresh" />
              <span>Reload</span>
            </button>
          </li>
          <li>
            <button type="button" onClick={desktop}>
              <SymbolIcon name="desktop_windows" />
              <span>Desktop view</span>
            </button>
          </li>
          <li>
            <button type="button" onClick={() => run('logout')}>
              <SymbolIcon name="logout" />
              <span>Log out</span>
            </button>
          </li>
        </ul>
      }
    />
  );
}

export default MoreScreen;
