import { useEffect, useRef } from 'react';
import { useNavItem } from './navItem';
import { matchesShortcut, usesCommandKey } from './shortcut';
import { type NavShortcut, navShortcuts } from './shortcuts';

// While focus is in a text field only shortcuts with ⌘ or Ctrl work.
function NavShortcuts() {
  // The handler reads the latest item state without re-registering on every
  // render.
  const nav = useNavItem();
  const navRef = useRef(nav);
  useEffect(() => {
    navRef.current = nav;
  });

  useEffect(() => {
    const items = Object.values<NavShortcut>(navShortcuts);
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.isComposing) return;
      const item = items.find((i) => matchesShortcut(e, i.shortcut));
      if (!item) return;
      const t = e.target as HTMLElement | null;
      const typing = !!t?.closest('input, select, textarea, [contenteditable]');
      if (typing && !usesCommandKey(item.shortcut)) return;
      // A matched shortcut is taken even while its item is disabled, so
      // e.g. ⌘S never falls through to the browser's Save Page.
      e.preventDefault();
      if (!navRef.current.disabled(item)) navRef.current.choose(item);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return null;
}

export default NavShortcuts;
