import type { ReactNode } from 'react';
import { useCloseMenu } from './menuBarContext';
import styles from './MenuItem.module.scss';

type MenuItemProps = {
  icon?: ReactNode;
  trailing?: ReactNode;
  disabled?: boolean;
  // Makes the item a checkbox.
  checked?: boolean;
  // Leaves the menu open, e.g. to toggle several checkboxes in a row.
  keepOpen?: boolean;
  // Makes the item a disclosure that shows more below it.
  expanded?: boolean;
  title?: string;
  onClick: () => void;
  children: ReactNode;
};

function MenuItem({
  icon,
  trailing,
  disabled,
  checked,
  keepOpen,
  expanded,
  title,
  onClick,
  children,
}: MenuItemProps) {
  const close = useCloseMenu();
  return (
    <button
      type="button"
      role={checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
      aria-checked={checked}
      aria-expanded={expanded}
      title={title}
      className={styles.item}
      tabIndex={-1}
      disabled={disabled}
      onClick={() => {
        if (!keepOpen) close();
        onClick();
      }}
    >
      {icon && <span className={styles.icon}>{icon}</span>}
      <span className={styles.label}>{children}</span>
      {trailing && <span className={styles.trailing}>{trailing}</span>}
    </button>
  );
}

export default MenuItem;
