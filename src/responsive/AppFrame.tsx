import { NavLink, Outlet } from 'react-router';
import { useSession } from '@/app/session';
import OfflineBanner from '@/components/OfflineBanner';
import SymbolIcon from '@/components/symbols/SymbolIcon';
import LiveIndicator from '@/nav/actions/LiveIndicator';
import BackupStatus from './BackupStatus';
import ScopePicker from './ScopePicker';
import { responsivePaths } from './paths';
import styles from './AppFrame.module.scss';

const sections = [
  { to: responsivePaths.missions, label: 'Missions', icon: 'list_alt' },
  { to: responsivePaths.archive, label: 'Archive', icon: 'manage_search' },
  { to: responsivePaths.map, label: 'Map', icon: 'map' },
  { to: responsivePaths.reports, label: 'Reports', icon: 'description' },
  { to: responsivePaths.settings, label: 'Settings', icon: 'settings' },
];

// One nav element that is a bottom tab bar on phones and a sidebar from
// tablet width up; only the CSS differs.
function AppFrame() {
  const { logout } = useSession();

  const signOut = () => {
    logout().catch((err: unknown) =>
      window.alert(`Cannot log out: ${err instanceof Error ? err.message : String(err)}`),
    );
  };

  return (
    <div className={styles.frame}>
      <header className={styles.header}>
        <span className={styles.brand}>TMD</span>
        <span className={styles.headerEnd}>
          <ScopePicker />
          <BackupStatus />
          <LiveIndicator />
          <button
            type="button"
            className="icon-btn"
            aria-label="Log out"
            title="Log out"
            onClick={signOut}
          >
            <SymbolIcon name="logout" />
          </button>
        </span>
      </header>
      <nav className={styles.nav} aria-label="Main">
        {sections.map((s) => (
          <NavLink
            key={s.to}
            to={s.to}
            className={({ isActive }) => `${styles.item}${isActive ? ` ${styles.active}` : ''}`}
          >
            <SymbolIcon name={s.icon} className={styles.icon} />
            <span>{s.label}</span>
          </NavLink>
        ))}
      </nav>
      <main className={styles.main}>
        <OfflineBanner />
        <Outlet />
      </main>
    </div>
  );
}

export default AppFrame;
