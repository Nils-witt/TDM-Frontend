import type { ReactNode } from 'react';
import Menu from '../components/menu/Menu';
import styles from './TopLevelMenu.module.scss';

type TopLevelMenuProps = {
  // With an icon, the accessible name.
  label: string;
  icon?: ReactNode;
  children: ReactNode;
};

// An icon, like the app menu's logo, replaces the label.
function TopLevelMenu({ label, icon, children }: TopLevelMenuProps) {
  return (
    <Menu
      trigger={icon ?? label}
      className={icon ? styles.logo : ''}
      label={icon ? label : undefined}
    >
      {children}
    </Menu>
  );
}

export default TopLevelMenu;
