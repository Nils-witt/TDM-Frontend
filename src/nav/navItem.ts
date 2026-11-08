import { useWidgetWindows } from '../components/widgetWindow/widgetWindowContext';
import { type NavAction, useNavActions } from './navActions';

// Exactly one of href (external, new tab), action or widget (registry id,
// opened in a floating window).
export type Item = { action?: NavAction; widget?: string; href?: string; disabled?: boolean };

// Shared by the dropdown menus and their keyboard shortcuts.
export function useNavItem() {
  const { openWidget } = useWidgetWindows();
  const actions = useNavActions();
  const choose = (item: Item) => {
    if (item.widget) openWidget(item.widget);
    else if (item.href) window.open(item.href, '_blank', 'noopener,noreferrer');
    else if (item.action) actions.run(item.action);
  };
  const disabled = (item: Item) =>
    !!item.disabled || (item.action !== undefined && actions.disabled(item.action));
  return { choose, disabled };
}
