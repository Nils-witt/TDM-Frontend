import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { channelEvents } from './monitors/channels';
import { widgets } from './widgets/registry';
import type { Widget } from './widgets/widget';
import { type WidgetCategory, widgetCategories } from './widgets/widgetCategories';
import styles from './WidgetPicker.module.scss';

type Props = {
  onAdd: (id: string) => void;
  onClose: () => void;
};

const pickable = Object.values(widgets)
  .filter((w) => !w.windowOnly && !w.hiddenInPicker)
  .sort((a, b) => a.name.localeCompare(b.name));

const eventLabel = (event: string) => channelEvents.find((e) => e.event === event)?.label ?? event;

const matches = (w: Widget, query: string) =>
  w.name.toLowerCase().includes(query) || w.description.toLowerCase().includes(query);

// Opens when mounted; adding a widget closes it, as do Escape and the
// backdrop. A search looks through every category; without one the selected
// tab's widgets are listed, except at phone width, which has no room for the
// tabs and lists every category.
function WidgetPicker({ onAdd, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<WidgetCategory>(widgetCategories[0].id);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  const q = query.trim().toLowerCase();
  const groups = useMemo(
    () =>
      widgetCategories.map((c) => ({
        ...c,
        widgets: pickable.filter((w) => w.category === c.id && (q === '' || matches(w, q))),
      })),
    [q],
  );
  const shown = groups.filter((g) => g.widgets.length > 0);
  const first = (q === '' ? groups.find((g) => g.id === tab) : shown[0])?.widgets[0];

  const add = (id: string) => {
    onAdd(id);
    onClose();
  };

  // Kept from the layout editor behind it, whose Escape discards the draft
  // and whose ⌘Z undoes it.
  const onKeyDown = (e: KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
      e.preventDefault();
      if (first) add(first.id);
    }
  };

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="widget-picker-title"
      onKeyDown={onKeyDown}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.header}>
        <h2 id="widget-picker-title">Add widget</h2>
        <input
          type="search"
          aria-label="Search widgets"
          placeholder="Search widgets"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <button type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
      </div>
      <div className={styles.content}>
        <div className={styles.tabs} role="tablist" aria-orientation="vertical">
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={q === '' && g.id === tab}
              className={styles.tab}
              disabled={g.widgets.length === 0}
              onClick={() => {
                setTab(g.id);
                setQuery('');
              }}
            >
              {g.label}
              <span className={styles.count}>{g.widgets.length}</span>
            </button>
          ))}
        </div>
        <div className={`${styles.list}${q === '' ? ` ${styles.tabbed}` : ''}`}>
          {shown.length === 0 && <p className={styles.empty}>No widget matches “{query}”.</p>}
          {shown.map((g) => (
            <section
              key={g.id}
              aria-label={g.label}
              className={g.id === tab ? styles.current : undefined}
            >
              <h3>{g.label}</h3>
              <ul>
                {g.widgets.map((w) => (
                  <li key={w.id}>
                    <WidgetEntry widget={w} onAdd={add} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </dialog>
  );
}

function WidgetEntry({ widget: w, onAdd }: { widget: Widget; onAdd: (id: string) => void }) {
  const hasOptions = (w.options?.length ?? 0) > 0;
  return (
    <button type="button" className={styles.entry} onClick={() => onAdd(w.id)}>
      <span className={styles.title}>
        <span className={styles.name}>{w.name}</span>
        {hasOptions && <span className={styles.badge}>Options</span>}
        <span className={styles.size} title="Default size in grid cells">
          {w.defaultWidth} × {w.defaultHeight}
        </span>
      </span>
      <span className={styles.description}>{w.description}</span>
      {((w.emits?.length ?? 0) > 0 || (w.consumes?.length ?? 0) > 0) && (
        <span className={styles.events}>
          {w.emits?.map((e) => (
            <span key={`emits-${e}`} className={`${styles.event} ${styles.emits}`}>
              Sends: {eventLabel(e)}
            </span>
          ))}
          {w.consumes?.map((e) => (
            <span key={`consumes-${e}`} className={`${styles.event} ${styles.consumes}`}>
              Receives: {eventLabel(e)}
            </span>
          ))}
        </span>
      )}
    </button>
  );
}

export default WidgetPicker;
