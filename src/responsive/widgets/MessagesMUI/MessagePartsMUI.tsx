import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
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
