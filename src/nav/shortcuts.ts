import type { NavAction } from './navActions';

// Spec as in shortcut.ts.
export type NavShortcut = { shortcut: string } & ({ action: NavAction } | { widget: string });

// The menus show them by key.
export const navShortcuts = {
  saveMission: { shortcut: 'Mod+S', action: 'saveMission' },
  clearMission: { shortcut: 'Alt+Shift+C', action: 'clearMission' },
  closeMission: { shortcut: 'Alt+Shift+L', action: 'closeMission' },
  printMission: { shortcut: 'Mod+P', action: 'printMission' },
  newLogEntry: { shortcut: 'Alt+Shift+N', widget: 'LogbookForm' },
} satisfies Record<string, NavShortcut>;

export type NavShortcutKey = keyof typeof navShortcuts;
