import { useEffect, useId, useMemo, useState } from 'react';
import SymbolIcon from './SymbolIcon';
import { symbolNames } from './symbolNames';
import styles from './IconPicker.module.scss';

// Bounds the matches rendered at once; typing narrows them down.
const maxShown = 120;

// An empty value is no icon.
function IconPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (name: string) => void;
  disabled?: boolean;
}) {
  const [all, setAll] = useState<string[] | null>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const gridId = useId();

  useEffect(() => {
    if (open && all === null) void symbolNames().then(setAll);
  }, [open, all]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase().replaceAll(' ', '_');
    return (all ?? []).filter((n) => n.includes(q)).slice(0, maxShown);
  }, [all, query]);

  return (
    <div>
      <div className="row">
        <span className={styles.current} title={value || 'No icon'}>
          {value ? <SymbolIcon name={value} /> : <span className="muted">–</span>}
        </span>
        <code>{value || 'no icon'}</code>
        <button
          type="button"
          className="btn"
          aria-expanded={open}
          aria-controls={gridId}
          disabled={disabled}
          onClick={() => setOpen(!open)}
        >
          {open ? 'Close' : 'Choose icon'}
        </button>
        {value && (
          <button type="button" className="btn" disabled={disabled} onClick={() => onChange('')}>
            No icon
          </button>
        )}
      </div>
      {open && (
        <div id={gridId} className={styles.panel}>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search icons, e.g. radio"
            aria-label="Search icons"
            autoFocus
          />
          {all === null ? (
            <p className="muted">Loading icons…</p>
          ) : matches.length === 0 ? (
            <p className="muted">No matching icons.</p>
          ) : (
            <div className={styles.grid}>
              {matches.map((n) => (
                <button
                  key={n}
                  type="button"
                  className="icon-btn"
                  title={n}
                  aria-label={n}
                  aria-pressed={n === value}
                  onClick={() => {
                    onChange(n);
                    setOpen(false);
                  }}
                >
                  <SymbolIcon name={n} className={styles.gridIcon} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default IconPicker;
