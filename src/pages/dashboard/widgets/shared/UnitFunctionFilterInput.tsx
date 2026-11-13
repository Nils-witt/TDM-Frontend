import { useMemo } from 'react';
import { noFunction } from './unitFunctionFilter';
import styles from './TypeFilterInput.module.scss';

// Like the Logbook's TypeFilterInput: the function codes of the units shown,
// "No function", and selected codes no unit has any more, so they can still
// be cleared. Nothing selected shows every unit. In a FieldRow, id is the list
// button's.
function UnitFunctionFilterInput({
  id,
  functions,
  filter,
  onChange,
}: {
  id?: string;
  functions: readonly string[];
  filter: ReadonlySet<string>;
  onChange: (filter: ReadonlySet<string>) => void;
}) {
  const options = useMemo(() => {
    const gone = [...filter].filter((f) => f !== noFunction && !functions.includes(f));
    return [
      ...[...functions, ...gone].map((f) => ({ value: f, label: f })),
      { value: noFunction, label: 'No function' },
    ];
  }, [functions, filter]);

  const toggle = (value: string) => {
    const next = new Set(filter);
    if (!next.delete(value)) next.add(value);
    onChange(next);
  };

  return (
    <details className={styles.filter}>
      <summary id={id} className="btn">
        {filter.size === 0 ? 'All functions' : `Functions: ${filter.size} selected`}
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
            Show all functions
          </button>
        )}
      </div>
    </details>
  );
}

export default UnitFunctionFilterInput;
