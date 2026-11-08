import { useId } from 'react';
import { compactControls, FieldRow, Section } from '@/components/form';
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
