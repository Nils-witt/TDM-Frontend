import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { FormEvent, KeyboardEvent, ReactNode, Ref } from 'react';
import { submitOnModEnter } from '@/components/submitShortcut';

// As WidgetForm: Cmd+Enter (Ctrl+Enter off macOS) submits.
export function FormMUI({
  ref,
  onSubmit,
  children,
}: {
  ref?: Ref<HTMLFormElement>;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}) {
  return (
    <Box
      component="form"
      ref={ref}
      onSubmit={onSubmit}
      onKeyDown={(e: KeyboardEvent<HTMLFormElement>) => {
        if (!e.defaultPrevented) submitOnModEnter(e);
      }}
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      {children}
    </Box>
  );
}

// A fieldset, so disabled turns every native control in it off, as Section
// does; MUI's own disabled props are still set by the caller for the looks.
export function FormSectionMUI({
  legend,
  disabled,
  children,
}: {
  legend: ReactNode;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Box
      component="fieldset"
      disabled={disabled}
      sx={{
        border: 0,
        m: 0,
        p: 0,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      <Typography
        component="legend"
        variant="overline"
        color="text.secondary"
        sx={{ p: 0, mb: 0.5 }}
      >
        {legend}
      </Typography>
      {children}
    </Box>
  );
}

// Fields side by side that wrap below each other when there is no room.
export function FieldRowMUI({ children }: { children: ReactNode }) {
  return (
    <Stack
      direction="row"
      useFlexGap
      sx={{ flexWrap: 'wrap', gap: 1.5, '& > *': { flex: '1 1 10rem', minWidth: 0 } }}
    >
      {children}
    </Stack>
  );
}

// As FormActions: hidden leaves the buttons out; Discard is enabled while dirty.
export function FormActionsMUI({
  submitLabel,
  canSubmit,
  busy = false,
  onDiscard,
  discardLabel = 'Discard',
  dirty = true,
  hidden = false,
  aside,
}: {
  submitLabel: string;
  canSubmit: boolean;
  busy?: boolean;
  onDiscard?: () => void;
  discardLabel?: string;
  dirty?: boolean;
  hidden?: boolean;
  aside?: ReactNode;
}) {
  if (hidden) return null;
  return (
    <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
      <Button type="submit" variant="contained" disabled={!canSubmit || busy}>
        {submitLabel}
      </Button>
      {onDiscard && (
        <Button type="button" onClick={onDiscard} disabled={!dirty || busy}>
          {discardLabel}
        </Button>
      )}
      {aside && <Box sx={{ ml: 'auto', minWidth: 0 }}>{aside}</Box>}
    </Stack>
  );
}

export function FormErrorMUI({ error, onClose }: { error: ReactNode; onClose: () => void }) {
  if (!error) return null;
  return (
    <Alert severity="error" onClose={onClose}>
      {error}
    </Alert>
  );
}

export function MutedMUI({ children }: { children: ReactNode }) {
  return (
    <Typography variant="body2" color="text.secondary">
      {children}
    </Typography>
  );
}
