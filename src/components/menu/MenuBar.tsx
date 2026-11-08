import { type ReactNode, useEffect, useRef, useState } from 'react';
import { MenuBarContext } from './menuBarContext';
import styles from './MenuBar.module.scss';

// className styles the bar on top of its text style.
function MenuBar({ className, children }: { className: string; children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!openId) return;
    const outside = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpenId(null);
    };
    // Like a native menu, the open menu also closes when the window loses
    // focus or changes size.
    const close = () => setOpenId(null);
    document.addEventListener('pointerdown', outside);
    window.addEventListener('blur', close);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('blur', close);
      window.removeEventListener('resize', close);
    };
  }, [openId]);

  return (
    <MenuBarContext value={{ openId, setOpenId }}>
      <header className={`${styles.bar} ${className}`} ref={ref}>
        {children}
      </header>
    </MenuBarContext>
  );
}

export default MenuBar;
