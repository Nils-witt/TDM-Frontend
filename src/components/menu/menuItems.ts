// For keyboard navigation: the enabled items, plain and checkbox alike.
export const menuItems = (menu: HTMLElement | null) => [
  ...(menu?.querySelectorAll<HTMLElement>(
    '[role="menuitem"]:not(:disabled), [role="menuitemcheckbox"]:not(:disabled)',
  ) ?? []),
];
