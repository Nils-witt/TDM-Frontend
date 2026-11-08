import { type MouseEvent, useCallback, useState } from 'react';

export type Point = { x: number; y: number };

// Opened from the keyboard, the menu opens below the element instead of at the
// pointer.
export function useContextMenu() {
  const [at, setAt] = useState<Point | null>(null);
  const onContextMenu = useCallback((e: MouseEvent<HTMLElement>) => {
    e.preventDefault();
    // The context-menu key and Shift+F10 give no pointer position.
    if (e.clientX === 0 && e.clientY === 0) {
      const r = e.currentTarget.getBoundingClientRect();
      setAt({ x: r.left + 16, y: r.top + Math.min(r.height, 24) });
    } else {
      setAt({ x: e.clientX, y: e.clientY });
    }
  }, []);
  const close = useCallback(() => setAt(null), []);
  return { at, onContextMenu, close };
}
