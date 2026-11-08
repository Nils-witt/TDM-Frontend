import { createContext, use } from 'react';

// Only one menu is open at a time; like on macOS, while one is open, hovering
// another title switches to it.
type MenuBarState = {
  openId: string | null;
  setOpenId: (id: string | null) => void;
};

export const MenuBarContext = createContext<MenuBarState | null>(null);

export function useMenuBar(): MenuBarState {
  const v = use(MenuBarContext);
  if (!v) throw new Error('useMenuBar outside of MenuBar');
  return v;
}

export const useCloseMenu = () => {
  const { setOpenId } = useMenuBar();
  return () => setOpenId(null);
};
