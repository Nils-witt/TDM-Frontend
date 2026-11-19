import type { MessageReceiverOption } from '@/api/messages';
import type { MessageTag } from '@/api/messageTags';
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
