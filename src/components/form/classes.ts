import styles from './WidgetForm.module.scss';

// A fixed width instead of the global `grow`.
export const fieldWidth = {
  narrow: styles.narrow, // 5rem, e.g. a house number
  medium: styles.medium, // 7.5rem, e.g. a coordinate
};

// The form's compact inputs and buttons, for tables and lists outside a
// WidgetForm.
export const compactControls = styles.compactControls;

// For a widget made of several forms and lists, spaced and compact like a
// WidgetForm.
export const sectionStack = styles.sectionStack;
