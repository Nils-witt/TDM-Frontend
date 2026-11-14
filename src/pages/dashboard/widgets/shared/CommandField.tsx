import {
  type ChangeEvent,
  type KeyboardEvent,
  type Ref,
  type RefObject,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  type CommandContext,
  type Commands,
  commands as allCommands,
  completionAt,
  type Suggestion,
  valueCompletion,
} from './logbookCommands';
import { dropdownClass, dropdownItemClass } from '@/components/menu/menuClasses';
import styles from './CommandField.module.scss';

type FieldElement = HTMLTextAreaElement | HTMLInputElement;

type Props = {
  ref?: Ref<FieldElement>;
  value: string;
  onChange: (value: string) => void;
  ctx: CommandContext;
  // The default; otherwise a one-line input.
  multiline?: boolean;
  // All logbook commands by default.
  commands?: Commands;
  // Suggested while typing anything but a command, replacing the whole field.
  values?: string[];
  id?: string;
  className?: string;
  rows?: number;
  placeholder?: string;
  'aria-label'?: string;
  disabled?: boolean;
};

// Up and Down pick a suggestion, Enter or Tab inserts it (a command without an
// argument as its result, e.g. the time for /now), Escape hides them; Cmd+Enter
// still submits the form.
function CommandField({
  ref,
  value,
  onChange,
  ctx,
  multiline = true,
  commands = allCommands,
  values,
  rows,
  ...rest
}: Props) {
  const inner = useRef<FieldElement>(null);
  useImperativeHandle(ref, () => inner.current as FieldElement);
  const listId = useId();
  const [caret, setCaret] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  // Where to put the caret after inserting a suggestion, once rendered.
  const pendingCaret = useRef<number | null>(null);

  const completion =
    caret === null || dismissed
      ? null
      : (completionAt(value, caret, ctx, commands) ??
        (values ? valueCompletion(value, values) : null));
  const open = completion !== null && !rest.disabled;
  const activeIndex = completion ? Math.min(active, completion.suggestions.length - 1) : 0;

  useLayoutEffect(() => {
    const el = inner.current;
    if (el && pendingCaret.current !== null) {
      el.setSelectionRange(pendingCaret.current, pendingCaret.current);
      pendingCaret.current = null;
    }
  }, [value]);

  // Fixed below the field, so the widget's scrolling body does not clip it.
  useLayoutEffect(() => {
    if (!open || !inner.current || !list.current) return;
    const r = inner.current.getBoundingClientRect();
    Object.assign(list.current.style, {
      left: `${r.left}px`,
      top: `${r.bottom + 2}px`,
      minWidth: `${r.width}px`,
    });
  }, [open, value]);

  const trackCaret = () => setCaret(inner.current?.selectionStart ?? null);

  const change = (text: string) => {
    setDismissed(false);
    setActive(0);
    onChange(text);
  };

  const insert = (s: Suggestion) => {
    if (!completion) return;
    const text = value.slice(0, completion.from) + s.value + value.slice(completion.to);
    const pos = completion.from + s.value.length;
    pendingCaret.current = pos;
    setCaret(pos);
    change(text);
    inner.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<FieldElement>) => {
    if (!completion || e.nativeEvent.isComposing) return;
    const n = completion.suggestions.length;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((activeIndex + (e.key === 'ArrowDown' ? 1 : n - 1)) % n);
    } else if ((e.key === 'Enter' && !e.metaKey && !e.ctrlKey) || e.key === 'Tab') {
      e.preventDefault();
      const suggestion = completion.suggestions[activeIndex];
      if (suggestion) insert(suggestion);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setDismissed(true);
    }
  };

  const optionId = (i: number) => `${listId}-${i}`;

  const field = {
    ...rest,
    value,
    onChange: (e: ChangeEvent<FieldElement>) => {
      change(e.target.value);
      setCaret(e.target.selectionStart);
    },
    onSelect: trackCaret,
    onBlur: () => setCaret(null),
    onKeyDown,
    'aria-autocomplete': 'list' as const,
    'aria-controls': open ? listId : undefined,
    'aria-activedescendant': open ? optionId(activeIndex) : undefined,
  };

  return (
    <>
      {multiline ? (
        <textarea {...field} ref={inner as RefObject<HTMLTextAreaElement>} rows={rows} />
      ) : (
        <input {...field} ref={inner as RefObject<HTMLInputElement>} />
      )}
      {open && (
        <div
          ref={list}
          id={listId}
          role="listbox"
          className={`${dropdownClass} ${styles.suggestions}`}
        >
          {completion.suggestions.map((s, i) => (
            <div
              key={s.value}
              id={optionId(i)}
              role="option"
              aria-selected={i === activeIndex}
              className={`${dropdownItemClass(i === activeIndex)} ${styles.suggestion}`}
              // Keep focus in the field, so the caret survives the click.
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => insert(s)}
              onPointerEnter={() => setActive(i)}
            >
              <span className={styles.label}>{s.label}</span>
              {s.detail && <span className={styles.detail}>{s.detail}</span>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default CommandField;
