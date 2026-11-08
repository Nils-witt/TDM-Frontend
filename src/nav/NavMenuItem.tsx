import type { ReactNode } from 'react';
import MenuItem from '../components/menu/MenuItem';
import { type Item, useNavItem } from './navItem';
import { formatShortcut } from './shortcut';
import { navShortcuts, type NavShortcutKey } from './shortcuts';

type NavMenuItemProps = Item & {
  label: ReactNode;
  icon?: ReactNode;
  // Shown greyed out on the right; NavShortcuts handles the key press itself.
  shortcut?: NavShortcutKey;
  // Only shown, for keys the browser handles itself, such as Mod+R.
  keys?: string;
  // Shown on the right, before the shortcut.
  trailing?: ReactNode;
};

function NavMenuItem({ label, icon, shortcut, keys, trailing, ...item }: NavMenuItemProps) {
  const { choose, disabled } = useNavItem();
  const spec = shortcut ? navShortcuts[shortcut].shortcut : keys;
  return (
    <MenuItem
      icon={icon}
      disabled={disabled(item)}
      trailing={
        (trailing || spec) && (
          <>
            {trailing}
            {spec && <kbd>{formatShortcut(spec)}</kbd>}
          </>
        )
      }
      onClick={() => choose(item)}
    >
      {label}
    </MenuItem>
  );
}

export default NavMenuItem;
