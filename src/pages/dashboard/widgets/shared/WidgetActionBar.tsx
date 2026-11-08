import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import MenuBar from '@/components/menu/MenuBar';
import { menuItemClass, menuItemsClass } from '@/components/menu/menuClasses';
import { useWidgetActionSlot } from '../widgetActionSlot';
import styles from './WidgetActionBar.module.scss';

// Rendered anywhere in a widget's content, it shows above the content, outside
// the scrolling area. Its children are WidgetActions and Menus.
function WidgetActionBar({ label, children }: { label: string; children: ReactNode }) {
  const slot = useWidgetActionSlot();
  if (!slot) return null;
  return createPortal(
    <MenuBar className={styles.bar}>
      <div className={menuItemsClass} role="toolbar" aria-label={label}>
        {children}
      </div>
    </MenuBar>,
    slot,
  );
}

type ActionProps = {
  // For actions that toggle.
  pressed?: boolean;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
  children: ReactNode;
};

export function WidgetAction({ pressed, disabled, title, onClick, children }: ActionProps) {
  return (
    <button
      type="button"
      className={menuItemClass('', pressed)}
      aria-pressed={pressed}
      disabled={disabled}
      title={title}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default WidgetActionBar;
