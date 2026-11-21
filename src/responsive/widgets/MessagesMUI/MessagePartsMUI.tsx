import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { type MessageTag, tagTextColor } from '@/api/messageTags';
import { usePriorityLabel } from '@/data/messages';

const priorityColors: Record<number, { bgcolor: string; color: string }> = {
  1: { bgcolor: 'var(--triage-red)', color: '#fff' },
  2: { bgcolor: 'var(--triage-yellow)', color: '#000' },
};

export function PriorityChipMUI({ priority }: { priority: number }) {
  const label = usePriorityLabel(priority);
  return (
    <Chip size="small" label={label} title={`Priority ${label}`} sx={priorityColors[priority]} />
  );
}

export function TagChipMUI({ tag }: { tag: MessageTag }) {
  return (
    <Chip
      size="small"
      label={tag.deleted ? `${tag.name} (deleted)` : tag.name}
      sx={{ bgcolor: tag.color, color: tagTextColor(tag.color) }}
    />
  );
}

export function TagChipsMUI({ tags }: { tags: readonly MessageTag[] }) {
  if (tags.length === 0) return null;
  return (
    <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 0.5 }} component="span">
      {tags.map((t) => (
        <TagChipMUI key={t.id} tag={t} />
      ))}
    </Stack>
  );
}

// The tags as one multi-select, the chosen ones shown as chips; choices
// gives the order and the chips' colors.
export function TagSelectMUI({
  choices,
  value,
  disabled,
  onChange,
}: {
  choices: readonly MessageTag[];
  value: readonly string[];
  disabled: boolean;
  onChange: (ids: string[]) => void;
}) {
  const chosen = (ids: readonly string[]) => choices.filter((t) => ids.includes(t.id));
  return (
    <TextField
      select
      label="Tags"
      value={value}
      disabled={disabled}
      slotProps={{
        select: {
          multiple: true,
          displayEmpty: true,
          renderValue: (ids) =>
            (ids as string[]).length === 0 ? (
              <span>None</span>
            ) : (
              <TagChipsMUI tags={chosen(ids as string[])} />
            ),
        },
        inputLabel: { shrink: true },
      }}
      onChange={(e) => {
        const v = e.target.value as unknown as string[] | string;
        // Kept in the order of the choices, not of the clicks.
        const ids = typeof v === 'string' ? v.split(',') : v;
        onChange(chosen(ids).map((t) => t.id));
      }}
    >
      {choices.map((t) => (
        <MenuItem key={t.id} value={t.id}>
          <Checkbox size="small" checked={value.includes(t.id)} sx={{ py: 0 }} />
          <TagChipMUI tag={t} />
        </MenuItem>
      ))}
    </TextField>
  );
}
