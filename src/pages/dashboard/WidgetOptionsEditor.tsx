import { useId } from 'react';
import { resolveMapStyle, useMapStyles } from '@/api/maps';
import { compactControls, FieldRow, Section } from '@/components/form';
import { useCatalogs } from '@/data/catalogContext';
import type { Widget } from './widgets/widget';
import {
  resolveOptions,
  type OptionValue,
  type WidgetOption,
  type WidgetOptionValues,
  withOption,
} from './widgets/widgetOptions';

type Props = {
  widget: Widget;
  options: WidgetOptionValues | undefined;
  onChange: (options: WidgetOptionValues | undefined) => void;
};

// A type no longer in the catalog stays checked until unchecked.
function LogbookTypesInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: readonly string[];
  onChange: (value: readonly string[]) => void;
}) {
  const { logbookTypes } = useCatalogs();
  const known = new Set(logbookTypes.items.map((t) => t.id));
  const options = [
    ...[...logbookTypes.items]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((t) => ({ id: t.id, name: t.name })),
    ...value.filter((id) => !known.has(id)).map((id) => ({ id, name: 'Unknown type' })),
  ];
  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <FieldRow id={id} label={label} wrapLabel>
      <span id={id} className="row">
        {options.length === 0 && <span className="muted">No logbook types.</span>}
        {options.map((o) => (
          <label key={o.id} className="row">
            <input type="checkbox" checked={value.includes(o.id)} onChange={() => toggle(o.id)} />
            {o.name}
          </label>
        ))}
      </span>
    </FieldRow>
  );
}

// A style no longer configured stays a choice, marked as showing the default.
function MapStyleInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { items } = useMapStyles();
  const fallback = resolveMapStyle(items, '');
  const unknown = value !== '' && !items.some((s) => s.id === value);

  return (
    <FieldRow id={id} label={label} wrapLabel>
      <select id={id} className="grow" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Default{fallback ? ` (${fallback.name})` : ''}</option>
        {items
          .toSorted((a, b) => a.name.localeCompare(b.name))
          .map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        {unknown && <option value={value}>Deleted style (shows the default)</option>}
      </select>
    </FieldRow>
  );
}

// Values equal to an option's default are left out of the layout.
function WidgetOptionsEditor({ widget, options, onChange }: Props) {
  const id = useId();
  const defs = widget.options ?? [];
  const values = resolveOptions(defs, options);
  const set = (def: WidgetOption, value: OptionValue) =>
    onChange(withOption(defs, options, def, value));

  return (
    <Section legend={`${widget.name} options`} className={compactControls}>
      {defs.map((def) => {
        const inputId = `${id}-${def.key}`;
        const value = values[def.key];
        switch (def.type) {
          case 'boolean':
            return (
              <label key={def.key} className="row">
                <input
                  type="checkbox"
                  checked={value === true}
                  onChange={(e) => set(def, e.target.checked)}
                />
                {def.label}
              </label>
            );
          case 'text':
            return (
              <FieldRow key={def.key} id={inputId} label={def.label} wrapLabel>
                <input
                  id={inputId}
                  className="grow"
                  value={String(value)}
                  onChange={(e) => set(def, e.target.value)}
                />
              </FieldRow>
            );
          case 'number':
            return (
              <FieldRow key={def.key} id={inputId} label={def.label} wrapLabel>
                <input
                  id={inputId}
                  className="grow"
                  type="number"
                  min={def.min}
                  max={def.max}
                  value={Number(value)}
                  onChange={(e) => {
                    const n = e.target.valueAsNumber;
                    if (Number.isFinite(n)) set(def, n);
                  }}
                />
              </FieldRow>
            );
          case 'logbookTypes':
            return (
              <LogbookTypesInput
                key={def.key}
                id={inputId}
                label={def.label}
                value={Array.isArray(value) ? value : def.default}
                onChange={(v) => set(def, v)}
              />
            );
          case 'mapStyle':
            return (
              <MapStyleInput
                key={def.key}
                id={inputId}
                label={def.label}
                value={String(value)}
                onChange={(v) => set(def, v)}
              />
            );
          case 'select':
            return (
              <FieldRow key={def.key} id={inputId} label={def.label} wrapLabel>
                <select
                  id={inputId}
                  className="grow"
                  value={String(value)}
                  onChange={(e) => set(def, e.target.value)}
                >
                  {def.choices.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </FieldRow>
            );
        }
      })}
    </Section>
  );
}

export default WidgetOptionsEditor;
