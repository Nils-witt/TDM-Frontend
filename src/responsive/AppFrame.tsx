import { NavLink, Outlet, useNavigate } from 'react-router';
import { preferDesktop } from '@/app/mobileRoute';
import { useSession } from '@/app/session';
import SymbolIcon from '@/components/symbols/SymbolIcon';
import LiveIndicator from '@/nav/actions/LiveIndicator';
import { responsivePaths } from './paths';
import styles from './AppFrame.module.scss';

const sections = [{ to: responsivePaths.missions, label: 'Missions', icon: 'list_alt' }];

// One nav element that is a bottom tab bar on phones and a sidebar from
// tablet width up; only the CSS differs.
function AppFrame() {
  const { logout } = useSession();
  const navigate = useNavigate();

  const desktop = () => {
    preferDesktop(true);
    void navigate('/');
  };
  const signOut = () => {
    logout().catch((err: unknown) =>
      window.alert(`Cannot log out: ${err instanceof Error ? err.message : String(err)}`),
    );
  };

  return (
    <div className={styles.frame}>
      <header className={styles.header}>
        <span className={styles.brand}>Universam</span>
        <LiveIndicator />
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
        <span className={styles.spacer} />
        <button type="button" className={styles.item} onClick={desktop}>
          <SymbolIcon name="desktop_windows" className={styles.icon} />
          <span>Desktop</span>
        </button>
        <button type="button" className={styles.item} onClick={signOut}>
          <SymbolIcon name="logout" className={styles.icon} />
          <span>Log out</span>
        </button>
      </nav>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

export default AppFrame;
