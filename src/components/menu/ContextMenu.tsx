import { type KeyboardEvent, type ReactNode, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MenuBarContext } from './menuBarContext';
import { menuItems as items } from './menuItems';
import styles from './ContextMenu.module.scss';

import type { Point } from './useContextMenu';

type Props = {
  // Viewport coordinates; null keeps it closed.
  at: Point | null;
  onClose: () => void;
  label?: string;
  children: ReactNode;
};

// Like a native context menu: choosing an item, Escape, a click elsewhere,
// scrolling and resizing close it. It stays inside the viewport.
function ContextMenu({ at, onClose, label, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Shift the menu back into the viewport once its size is known, before
  // it is painted.
  useLayoutEffect(() => {
    const menu = ref.current;
    if (at === null || menu === null) return;
    const { width, height } = menu.getBoundingClientRect();
    menu.style.left = `${Math.max(4, Math.min(at.x, window.innerWidth - width - 4))}px`;
    menu.style.top = `${Math.max(4, Math.min(at.y, window.innerHeight - height - 4))}px`;
  }, [at]);

  useEffect(() => {
    const menu = ref.current;
    if (at === null || menu === null) return;
    const previous = document.activeElement as HTMLElement | null;
    items(menu)[0]?.focus();
    const outside = (e: PointerEvent) => {
      if (!menu.contains(e.target as Node)) onClose();
    };
    const dismiss = () => onClose();
    document.addEventListener('pointerdown', outside);
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    window.addEventListener('blur', dismiss);
    return () => {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('blur', dismiss);
      // Give focus back to where the menu was opened from, unless an item
      // moved it elsewhere, such as into a dialog.
      if (menu.contains(document.activeElement) || document.activeElement === document.body) {
        previous?.focus();
      }
    };
  }, [at, onClose]);

  if (at === null) return null;

  const onKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
      case 'Tab':
        onClose();
        break;
      case 'ArrowDown':
      case 'ArrowUp': {
        const list = items(ref.current);
        const i = list.indexOf(document.activeElement as HTMLElement);
        const next =
          e.key === 'ArrowDown' ? (i + 1) % list.length : (i - 1 + list.length) % list.length;
        list[next]?.focus();
        break;
      }
      default:
        return;
    }
    e.preventDefault();
  };

  // MenuItems close their menu through the menu bar context.
  return createPortal(
    <MenuBarContext value={{ openId: 'context-menu', setOpenId: onClose }}>
      <div
        ref={ref}
        className={styles.dropdown}
        role="menu"
        aria-label={label}
        style={{ position: 'fixed', left: at.x, top: at.y }}
        onKeyDown={onKeyDown}
        onContextMenu={(e) => {
          // React events bubble out of the portal: keep the opener from
          // reopening the menu at the new point.
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {children}
      </div>
    </MenuBarContext>,
    document.body,
  );
}

export default ContextMenu;
