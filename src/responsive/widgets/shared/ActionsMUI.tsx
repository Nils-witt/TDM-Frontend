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

export function ActionMUI({
  pressed,
  disabled,
  title,
  onClick,
  children,
}: {
  pressed?: boolean;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      size="small"
      variant={pressed ? 'contained' : 'outlined'}
      aria-pressed={pressed}
      disabled={disabled}
      title={title}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
