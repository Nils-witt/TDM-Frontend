import { InfoIcon, LocationIcon } from '../components/icons';
import MenuBar from '../components/menu/MenuBar';
import MenuSeparator from '../components/menu/MenuSeparator';
import AboutProvider from './AboutProvider';
import NavShortcuts from './NavShortcuts';
import NavMenuItem from './NavMenuItem';
import TopLevelMenu from './TopLevelMenu';
import ViewMenu from './ViewMenu';
import AppTitle from './menus/AppTitle';
import ChannelIndicator from './actions/ChannelIndicator';
import Clock from './actions/Clock';
import Fullscreen from './actions/Fullscreen';
import UserMenu from './actions/UserMenu';
import styles from './Nav.module.scss';

// Styled like the macOS menu bar; each status indicator on the right keeps its
// own state.
function Nav() {
  return (
    <AboutProvider>
      <NavShortcuts />
      <MenuBar className={styles.bar}>
        <nav className={styles.left} aria-label="Main">
          <TopLevelMenu label="Universam menu" icon={<LocationIcon />}>
            <NavMenuItem label="About Universam" action="about" icon={<InfoIcon />} />
            <MenuSeparator />
            <NavMenuItem label="Reload" action="reload" keys="Mod+R" />
          </TopLevelMenu>
          <AppTitle />
          <TopLevelMenu label="Widgets">
            <NavMenuItem label="Example" widget="Example" shortcut="example" />
          </TopLevelMenu>
          <ViewMenu />
        </nav>
        <div className={styles.right}>
          <ChannelIndicator />
          <UserMenu />
          <Clock />
          <Fullscreen />
        </div>
      </MenuBar>
    </AboutProvider>
  );
}

export default Nav;
