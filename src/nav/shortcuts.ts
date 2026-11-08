import type { NavAction } from './navActions';

// Spec as in shortcut.ts.
export type NavShortcut = { shortcut: string } & ({ action: NavAction } | { widget: string });

// The menus show them by key.
export const navShortcuts = {
  example: { shortcut: 'Alt+Shift+E', widget: 'Example' },
} satisfies Record<string, NavShortcut>;

export type NavShortcutKey = keyof typeof navShortcuts;
