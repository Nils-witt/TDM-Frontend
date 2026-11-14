import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import TextField from '@mui/material/TextField';
import {
  type KeyboardEvent,
  type Ref,
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
} from '@/pages/dashboard/widgets/shared/logbookCommands';

type FieldElement = HTMLTextAreaElement | HTMLInputElement;

type Props = {
  ref?: Ref<FieldElement>;
  label: string;
  value: string;
  onChange: (value: string) => void;
  ctx: CommandContext;
  multiline?: boolean;
  commands?: Commands;
  values?: string[];
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
};

// As CommandField: Up and Down pick a suggestion, Enter or Tab inserts it,
// Escape hides them; Cmd+Enter still submits the form.
function CommandFieldMUI({
  ref,
  label,
  value,
  onChange,
  ctx,
  multiline = true,
  commands = allCommands,
  values,
  rows,
  placeholder,
  disabled,
}: Props) {
  const inner = useRef<FieldElement>(null);
  useImperativeHandle(ref, () => inner.current as FieldElement);
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null);
  const listId = useId();
  const [caret, setCaret] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const pendingCaret = useRef<number | null>(null);

  const completion =
    caret === null || dismissed
      ? null
      : (completionAt(value, caret, ctx, commands) ??
        (values ? valueCompletion(value, values) : null));
  const open = completion !== null && !disabled;
  const activeIndex = completion ? Math.min(active, completion.suggestions.length - 1) : 0;

  useLayoutEffect(() => {
    const el = inner.current;
    if (el && pendingCaret.current !== null) {
      el.setSelectionRange(pendingCaret.current, pendingCaret.current);
      pendingCaret.current = null;
    }
  }, [value]);

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

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
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

  return (
    <>
      <TextField
        ref={setAnchor}
        inputRef={inner}
        label={label}
        size="small"
        fullWidth
        multiline={multiline}
        minRows={multiline ? rows : undefined}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => {
          change(e.target.value);
          setCaret(e.target.selectionStart);
        }}
        onSelect={trackCaret}
        onBlur={() => setCaret(null)}
        onKeyDown={onKeyDown}
        slotProps={{
          htmlInput: {
            'aria-autocomplete': 'list',
            'aria-controls': open ? listId : undefined,
            'aria-activedescendant': open ? optionId(activeIndex) : undefined,
          },
        }}
      />
      <Popper
        open={open}
        anchorEl={anchor}
        placement="bottom-start"
        sx={{ zIndex: (t) => t.zIndex.modal + 1 }}
        style={{ minWidth: anchor?.offsetWidth }}
      >
        <Paper elevation={8}>
          <MenuList id={listId} role="listbox" dense autoFocusItem={false}>
            {completion?.suggestions.map((s, i) => (
              <MenuItem
                key={s.value}
                id={optionId(i)}
                role="option"
                selected={i === activeIndex}
                aria-selected={i === activeIndex}
                // Keep focus in the field, so the caret survives the click.
                onPointerDown={(e) => e.preventDefault()}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insert(s)}
                onPointerEnter={() => setActive(i)}
              >
                <ListItemText
                  primary={s.label}
                  secondary={s.detail}
                  slotProps={{ secondary: { sx: { whiteSpace: 'normal' } } }}
                />
              </MenuItem>
            ))}
          </MenuList>
        </Paper>
      </Popper>
    </>
  );
}

export default CommandFieldMUI;
