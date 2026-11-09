import { Link, NavLink, Outlet, useLocation } from 'react-router';
import SymbolIcon from '@/components/symbols/SymbolIcon';
import { useSelectedMission } from '@/data/selectedMissionContext';
import LiveIndicator from '@/nav/actions/LiveIndicator';
import { mobilePaths } from './mobilePaths';
import styles from './MobileLayout.module.scss';

const tabs = [
  { to: mobilePaths.missions, label: 'Missions', icon: 'list_alt' },
  { to: mobilePaths.logbook, label: 'Logbook', icon: 'menu_book' },
  { to: mobilePaths.map, label: 'Map', icon: 'map' },
  { to: mobilePaths.files, label: 'Files', icon: 'attach_file' },
  { to: mobilePaths.more, label: 'More', icon: 'more_horiz' },
];

// The selected mission is named at the top, as the Logbook, Files and Map tabs
// work on it.
function MobileLayout() {
  const { pathname } = useLocation();
  const { mission } = useSelectedMission();
  const tab = tabs.find((t) => pathname.startsWith(t.to));

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <h2>{tab?.label ?? 'Universam'}</h2>
        {mission && (
          <Link to={mobilePaths.mission(mission.id)} className={styles.mission}>
            {mission.occurred_event || 'Untitled mission'}
          </Link>
        )}
        <LiveIndicator />
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
      <nav className={styles.tabs} aria-label="Main">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) => `${styles.tab}${isActive ? ` ${styles.active}` : ''}`}
          >
            <SymbolIcon name={t.icon} className={styles.tabIcon} />
            <span>{t.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default MobileLayout;
