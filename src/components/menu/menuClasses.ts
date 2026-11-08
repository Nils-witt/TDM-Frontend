import styles from './menuBase.module.css';

export const menuItemsClass = styles.items;

// A title, link, button or status text of the bar.
export const menuItemClass = (className = '', active = false) =>
  [styles.item, active && styles.active, className].filter(Boolean).join(' ');

// Opens the dropdowns of the menus inside it to the left.
export const menuAlignEndClass = styles.alignEnd;

// A list of choices styled like a menu dropdown, e.g. completions.
export const dropdownClass = styles.dropdown;
export const dropdownItemClass = (active = false) =>
  active ? `${styles.dropdownItem} ${styles.active}` : styles.dropdownItem;

// A small rounded label, e.g. trailing a dropdown item.
export const menuBadgeClass = styles.badge;
