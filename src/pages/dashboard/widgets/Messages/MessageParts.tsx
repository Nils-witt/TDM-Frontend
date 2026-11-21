import type { MessageReceiverOption } from '@/api/messages';
import { type MessageTag, tagTextColor } from '@/api/messageTags';
import Chip, { type ChipTone } from '@/components/Chip';
import { usePriorityLabel } from '@/data/messages';
import MessageTagChip from '../shared/MessageTagChip';
import styles from './Messages.module.scss';

const priorityTones: Record<number, ChipTone> = { 1: 'red', 2: 'yellow' };

export function PriorityChip({ priority }: { priority: number }) {
  const label = usePriorityLabel(priority);
  return (
    <Chip label={label} tone={priorityTones[priority] ?? 'default'} title={`Priority ${label}`} />
  );
}

export function TagChips({ tags }: { tags: readonly MessageTag[] }) {
  if (tags.length === 0) return null;
  return (
    <span className={styles.chips}>
      {tags.map((t) => (
        <MessageTagChip key={t.id} tag={t} />
      ))}
    </span>
  );
}

// The picked functions of To or CC, each removable, then the fixed ones.
export function FunctionPicks({
  label,
  picked,
  options,
  all,
  fixed = [],
  disabled,
  onChange,
}: {
  label: string;
  picked: readonly string[];
  // What may still be added.
  options: readonly MessageReceiverOption[];
  all: readonly MessageReceiverOption[];
  fixed?: readonly MessageReceiverOption[];
  disabled: boolean;
  onChange: (ids: string[]) => void;
}) {
  const name = (id: string) => all.find((r) => r.id === id)?.name ?? id;
  const addable = options.filter((o) => !picked.includes(o.id));
  return (
    <span className={styles.chips}>
      {picked.map((id) => (
        <span key={id} className={styles.pick}>
          {name(id)}
          <button
            type="button"
            aria-label={`Remove ${name(id)} from ${label}`}
            disabled={disabled}
            onClick={() => onChange(picked.filter((p) => p !== id))}
          >
            ×
          </button>
        </span>
      ))}
      {fixed.map((r) => (
        <span
          key={r.id}
          className={`${styles.pick} ${styles.fixed}`}
          title="Always CC: added to every message"
        >
          {r.name}
        </span>
      ))}
      {addable.length > 0 && (
        <select
          aria-label={`Add to ${label}`}
          value=""
          disabled={disabled}
          onChange={(e) => e.target.value && onChange([...picked, e.target.value])}
        >
          <option value="">Add…</option>
          {addable.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      )}
    </span>
  );
}

// The chosen tags in their colors, each removable, then a select adding one
// of the others: a multi-select like FunctionPicks. choices gives the order.
export function TagPicks({
  choices,
  picked,
  disabled,
  onChange,
}: {
  choices: readonly MessageTag[];
  picked: readonly string[];
  disabled: boolean;
  onChange: (ids: string[]) => void;
}) {
  const inOrder = (ids: readonly string[]) =>
    choices.filter((t) => ids.includes(t.id)).map((t) => t.id);
  const chosen = choices.filter((t) => picked.includes(t.id));
  const addable = choices.filter((t) => !picked.includes(t.id));
  return (
    <span className={styles.chips}>
      {chosen.map((t) => (
        <span
          key={t.id}
          className={`${styles.pick} ${styles.tagPick}`}
          style={{ background: t.color, color: tagTextColor(t.color) }}
        >
          {t.deleted ? `${t.name} (deleted)` : t.name}
          <button
            type="button"
            aria-label={`Remove the tag ${t.name}`}
            disabled={disabled}
            onClick={() => onChange(picked.filter((p) => p !== t.id))}
          >
            ×
          </button>
        </span>
      ))}
      {addable.length > 0 && (
        <select
          aria-label="Add a tag"
          value=""
          disabled={disabled}
          onChange={(e) => e.target.value && onChange(inOrder([...picked, e.target.value]))}
        >
          <option value="">Add…</option>
          {addable.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      )}
    </span>
  );
}
