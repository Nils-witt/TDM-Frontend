import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import MenuBar from '@/components/menu/MenuBar';
import { menuItemClass, menuItemsClass } from '@/components/menu/menuClasses';
import { useWidgetActionSlot } from '../widgetActionSlot';
import styles from './WidgetActionBar.module.scss';

// Rendered anywhere in a widget's content, it shows above the content, outside
// the scrolling area. Its children are WidgetActions and Menus.
function WidgetActionBar({ label, children }: { label: string; children: ReactNode }) {
  const slot = useWidgetActionSlot();
  if (!slot) return null;
  return createPortal(
    <MenuBar className={styles.bar}>
      <div className={menuItemsClass} role="toolbar" aria-label={label}>
        {children}
      </div>
    </MenuBar>,
    slot,
  );
}

type ActionProps = {
  // For actions that toggle.
  pressed?: boolean;
  disabled?: boolean;
  title?: string;
  // A submit button with form (the form's id) submits that form from the bar,
  // which is outside it.
  type?: 'button' | 'submit';
  form?: string;
  onClick?: () => void;
  children: ReactNode;
};

export function WidgetAction({
  pressed,
  disabled,
  title,
  type = 'button',
  form,
  onClick,
  children,
}: ActionProps) {
  return (
    <button
      type={type}
      form={form}
      className={menuItemClass('', pressed)}
      aria-pressed={pressed}
      disabled={disabled}
      title={title}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// FormActions in the action bar, for the form whose id is form; the submit
// action is still the form's submit button, so its required-field checks and
// Enter apply. hidden leaves the actions out, e.g. while read-only.
export function FormActionBar({
  label,
  form,
  submitLabel,
  canSubmit = true,
  busy = false,
  onDiscard,
  discardLabel = 'Discard',
  dirty = true,
  hidden = false,
}: {
  label: string;
  form: string;
  submitLabel: ReactNode;
  canSubmit?: boolean;
  busy?: boolean;
  onDiscard?: () => void;
  discardLabel?: ReactNode;
  dirty?: boolean;
  hidden?: boolean;
}) {
  if (hidden) return null;
  return (
    <WidgetActionBar label={label}>
      <WidgetAction type="submit" form={form} disabled={!canSubmit || busy}>
        {submitLabel}
      </WidgetAction>
      {onDiscard && (
        <WidgetAction disabled={!dirty || busy} onClick={onDiscard}>
          {discardLabel}
        </WidgetAction>
      )}
    </WidgetActionBar>
  );
}

export default WidgetActionBar;
