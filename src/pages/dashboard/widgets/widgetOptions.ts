// Each widget kind declares its options; a layout item (or widget window) sets
// values, and the component receives every declared option resolved to a valid
// value.

type BaseOption<T extends string, V> = {
  key: string; // the option's name in a layout item's "options"
  label: string; // shown in the layout editor
  type: T;
  default: V;
};

type BooleanOption = BaseOption<'boolean', boolean>;
type TextOption = BaseOption<'text', string>;
type NumberOption = BaseOption<'number', number> & { min?: number; max?: number };
type SelectOption = BaseOption<'select', string> & {
  choices: { value: string; label: string }[];
};
// By ID.
type LogbookTypesOption = BaseOption<'logbookTypes', readonly string[]>;
// A map style's ID; empty, or one no longer configured, is the default style.
type MapStyleOption = BaseOption<'mapStyle', string>;
export type WidgetOption =
  BooleanOption | TextOption | NumberOption | SelectOption | LogbookTypesOption | MapStyleOption;

export type OptionValue = boolean | string | number | readonly string[];

// As stored in a layout item; may be incomplete or invalid (see
// resolveOptions).
export type WidgetOptionValues = Record<string, unknown>;

export type ResolvedOptions = Readonly<Record<string, OptionValue>>;

export type WidgetProps = { options: ResolvedOptions };

function validValue(def: WidgetOption, v: unknown): OptionValue | undefined {
  switch (def.type) {
    case 'boolean':
      return typeof v === 'boolean' ? v : undefined;
    case 'text':
    case 'mapStyle':
      return typeof v === 'string' ? v : undefined;
    case 'number':
      if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
      return Math.min(Math.max(v, def.min ?? -Infinity), def.max ?? Infinity);
    case 'select':
      return typeof v === 'string' && def.choices.some((c) => c.value === v) ? v : undefined;
    case 'logbookTypes':
      return Array.isArray(v) && v.every((x) => typeof x === 'string')
        ? [...new Set(v)]
        : undefined;
  }
}

// Lists are equal if they hold the same values, in any order.
function sameValue(a: OptionValue, b: OptionValue): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    const set = new Set<string>(a);
    return a.length === b.length && b.every((x: string) => set.has(x));
  }
  return a === b;
}

// Invalid values fall back to the default; undeclared keys are dropped.
export function resolveOptions(
  defs: WidgetOption[] | undefined,
  given: WidgetOptionValues | undefined,
): ResolvedOptions {
  return Object.fromEntries(
    (defs ?? []).map((d) => [d.key, validValue(d, given?.[d.key]) ?? d.default]),
  );
}

// A value equal to the default is removed rather than stored, and so are
// undeclared keys; undefined when nothing is left.
export function withOption(
  defs: WidgetOption[],
  given: WidgetOptionValues | undefined,
  def: WidgetOption,
  value: OptionValue,
): WidgetOptionValues | undefined {
  const next: WidgetOptionValues = {};
  for (const d of defs) {
    const v = d.key === def.key ? value : validValue(d, given?.[d.key]);
    if (v !== undefined && !sameValue(v, d.default)) next[d.key] = v;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}
