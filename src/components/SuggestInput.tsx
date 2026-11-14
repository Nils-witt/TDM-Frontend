import { type InputHTMLAttributes, type KeyboardEvent, useId, useState } from 'react';
import styles from './SuggestInput.module.scss';

// detail tells apart options of the same value, e.g. the city of a street;
// onPick, called after the value is put in, fills in what else the option
// knows.
export type Suggestion = { key: string; value: string; detail?: string; onPick?: () => void };

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onSelect'> & {
  value: string;
  onChange: (text: string) => void;
  suggestions: Suggestion[];
  // So suggestions are looked up only for the field being edited.
  onActive?: (active: boolean) => void;
};

// Any text can be typed in: suggestions never restrict the value.
export function SuggestInput({
  value,
  onChange,
  suggestions,
  onActive,
  className,
  onFocus,
  onBlur,
  onKeyDown,
  ...rest
}: Props) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  // An option equal to the text adds nothing, unless others share its value.
  const shown = suggestions.length === 1 && suggestions[0]?.value === value ? [] : suggestions;
  const expanded = open && shown.length > 0 && !rest.disabled && !rest.readOnly;
  const active = expanded && highlight >= 0 && highlight < shown.length ? highlight : -1;

  const pick = (s: Suggestion) => {
    onChange(s.value);
    s.onPick?.();
    setOpen(false);
    setHighlight(-1);
  };

  const keyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        if (shown.length === 0) return;
        e.preventDefault();
        const n = shown.length;
        const down = e.key === 'ArrowDown';
        setOpen(true);
        if (active < 0) setHighlight(down ? 0 : n - 1);
        else setHighlight((active + (down ? 1 : -1) + n) % n);
        return;
      }
      case 'Enter':
        // Enter picks the highlighted option instead of submitting.
        const option = shown[active];
        if (option) {
          e.preventDefault();
          pick(option);
        }
        return;
      case 'Escape':
        if (expanded) {
          e.preventDefault();
          e.stopPropagation();
          setOpen(false);
        }
        return;
    }
  };

  return (
    <div className={`${styles.wrap} ${className ?? ''}`}>
      <input
        {...rest}
        value={value}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlight(-1);
        }}
        onFocus={(e) => {
          onFocus?.(e);
          onActive?.(true);
          setOpen(true);
        }}
        onBlur={(e) => {
          onBlur?.(e);
          onActive?.(false);
          setOpen(false);
          setHighlight(-1);
        }}
        onKeyDown={keyDown}
      />
      <ul id={listId} role="listbox" className={styles.list} hidden={!expanded}>
        {expanded &&
          shown.map((s, i) => (
            <li
              key={s.key}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? styles.active : undefined}
              // mousedown, not click, so the input keeps the focus.
              onMouseDown={(e) => {
                e.preventDefault();
                pick(s);
              }}
              onMouseEnter={() => setHighlight(i)}
            >
              <span>{s.value}</span>
              {s.detail && <span className={styles.detail}>{s.detail}</span>}
            </li>
          ))}
      </ul>
    </div>
  );
}
