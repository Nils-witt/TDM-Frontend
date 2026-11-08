import { type JSX, type KeyboardEvent, type ReactNode, useEffect, useId, useRef } from 'react';
import { useMenuBar } from './menuBarContext';
import { menuItems as items } from './menuItems';
import styles from './Menu.module.scss';

type MenuProps = {
  trigger: ReactNode | JSX.Element;
  className?: string;
  label?: string;
  title?: string;
  // Lets the tutorial find the menu (data-tour).
  tourId?: string;
  children: ReactNode;
};

function Menu({ trigger, className = '', label, title, tourId, children }: MenuProps) {
  const id = useId();
  const { openId, setOpenId } = useMenuBar();
  const open = openId === id;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) items(menuRef.current)[0]?.focus();
  }, [open]);

  const onKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        setOpenId(null);
        buttonRef.current?.focus();
        break;
      case 'ArrowDown':
      case 'ArrowUp': {
        const list = items(menuRef.current);
        const i = list.indexOf(document.activeElement as HTMLElement);
        const next =
          e.key === 'ArrowDown' ? (i + 1) % list.length : (i - 1 + list.length) % list.length;
        list[next]?.focus();
        break;
      }
      case 'ArrowLeft':
      case 'ArrowRight': {
        // Move to the neighbouring menu of the bar, like a native menu bar.
        const bar = buttonRef.current?.closest('header');
        const triggers = [
          ...(bar?.querySelectorAll<HTMLButtonElement>('[aria-haspopup="menu"]') ?? []),
        ];
        const i = triggers.indexOf(buttonRef.current!);
        const step = e.key === 'ArrowRight' ? 1 : -1;
        triggers[(i + step + triggers.length) % triggers.length]?.click();
        break;
      }
      default:
        return;
    }
    e.preventDefault();
  };

  return (
    <div className={styles.menu} data-tour={tourId}>
      <button
        ref={buttonRef}
        type="button"
        className={`${styles.trigger} ${className}${open ? ` ${styles.open}` : ''}`}
        aria-label={label}
        title={title}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpenId(open ? null : id)}
        onPointerEnter={() => openId && !open && setOpenId(id)}
      >
        {trigger}
      </button>
      {open && (
        <div className={styles.dropdown} role="menu" ref={menuRef} onKeyDown={onKeyDown}>
          {children}
        </div>
      )}
    </div>
  );
}

export default Menu;
