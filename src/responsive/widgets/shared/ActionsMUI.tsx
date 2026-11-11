import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useWidgetActionSlot } from '@/pages/dashboard/widgets/widgetActionSlot';

// As WidgetActionBar: shown above the content, outside its scrolling area, in
// the slot WidgetBody provides; inline where there is none.
export function ActionsMUI({ label, children }: { label: string; children: ReactNode }) {
  const slot = useWidgetActionSlot();
  const bar = (
    <Stack
      direction="row"
      role="toolbar"
      aria-label={label}
      useFlexGap
      sx={{ flexWrap: 'wrap', gap: 1, px: slot ? 1 : 0, py: 0.5 }}
    >
      {children}
    </Stack>
  );
  return slot ? createPortal(bar, slot) : bar;
}

// A submit button with form (the form's id) submits that form from the bar,
// which is outside it.
export function ActionMUI({
  pressed,
  disabled,
  title,
  type = 'button',
  form,
  onClick,
  children,
}: {
  pressed?: boolean;
  disabled?: boolean;
  title?: string;
  type?: 'button' | 'submit';
  form?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      size="small"
      type={type}
      form={form}
      variant={pressed || type === 'submit' ? 'contained' : 'outlined'}
      aria-pressed={pressed}
      disabled={disabled}
      title={title}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

// As FormActionBar: FormActionsMUI in the action bar (inline where there is
// none) for the form whose id is form; hidden leaves the actions out.
export function FormActionBarMUI({
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
  submitLabel: string;
  canSubmit?: boolean;
  busy?: boolean;
  onDiscard?: () => void;
  discardLabel?: string;
  dirty?: boolean;
  hidden?: boolean;
}) {
  if (hidden) return null;
  return (
    <ActionsMUI label={label}>
      <ActionMUI type="submit" form={form} disabled={!canSubmit || busy}>
        {submitLabel}
      </ActionMUI>
      {onDiscard && (
        <ActionMUI disabled={!dirty || busy} onClick={onDiscard}>
          {discardLabel}
        </ActionMUI>
      )}
    </ActionsMUI>
  );
}
