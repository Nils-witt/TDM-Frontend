import { useMemo } from 'react';
import type { LogEntry } from '@/api/logbook';
import { useCatalogs } from '@/data/catalogContext';
import { noType, type TypeFilter, typeFilterValue } from './logbookEntries';
import styles from './TypeFilterInput.module.scss';

type Option = { value: string; label: string };

// Offers the logbook types, "No type", and types entries use that are no longer
// in the catalog. Nothing selected shows every entry. In a FieldRow, id is the
// list button's.
function TypeFilterInput({
  id,
  entries,
  filter,
  onChange,
}: {
  id?: string;
  entries: readonly Pick<LogEntry, 'type_id'>[];
  filter: TypeFilter;
  onChange: (filter: TypeFilter) => void;
}) {
  const { logbookTypes } = useCatalogs();
  const options = useMemo(() => {
    const defined: Option[] = [...logbookTypes.items]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((t) => ({ value: t.id, label: t.name }));
    const known = new Set(defined.map((o) => o.value));
    const unknown = new Set(
      entries.map(typeFilterValue).filter((v) => v !== noType && !known.has(v)),
    );
    return [
      ...defined,
      { value: noType, label: 'No type' },
      ...[...unknown].map((v) => ({ value: v, label: 'Unknown type' })),
    ];
  }, [entries, logbookTypes.items]);

  const toggle = (value: string) => {
    const next = new Set(filter);
    if (!next.delete(value)) next.add(value);
    onChange(next);
  };

  return (
    <details className={styles.filter}>
      <summary id={id} className="btn">
        {filter.size === 0 ? 'All types' : `Types: ${filter.size} selected`}
      </summary>
      <div className={styles.options}>
        {options.map((o) => (
          <label key={o.value} className="row">
            <input type="checkbox" checked={filter.has(o.value)} onChange={() => toggle(o.value)} />
            {o.label}
          </label>
        ))}
        {filter.size > 0 && (
          <button type="button" className="btn" onClick={() => onChange(new Set())}>
            Show all types
          </button>
        )}
      </div>
    </details>
  );
}

export default TypeFilterInput;
