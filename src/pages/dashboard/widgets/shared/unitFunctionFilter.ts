import { useMemo, useState } from 'react';
import type { ResolvedOptions, WidgetOption } from '../widgetOptions';
import { useWidgetState } from '../widgetState';

// The function filter of the unit widgets (Unit Status, Units in Mission,
// Add Unit), in the Logbook's style: hidden until the Filters action shows
// it, a set of function codes, empty = all. noFunction selects the units
// whose tactical name has none.

export const noFunction = '';

// Empty filters nothing.
export const unitFunctionOption: WidgetOption = {
  key: 'filterFunctions',
  label: 'Default function filter (comma-separated codes)',
  type: 'text',
  default: '',
};

const defaultFunctions = (options: ResolvedOptions) =>
  String(options.filterFunctions ?? '')
    .split(',')
    .map((f) => f.trim())
    .filter(Boolean);

const parseFunctions = (v: unknown) =>
  Array.isArray(v) && v.every((f) => typeof f === 'string') ? (v as string[]) : undefined;

export const matchesFunction = (filter: ReadonlySet<string>, fn: string) =>
  filter.size === 0 || filter.has(fn);

// Kept per widget across reloads (useWidgetState); a layout's default applies
// until it is changed.
export function useUnitFunctionFilter(options: ResolvedOptions) {
  const [stored, setStored] = useWidgetState(
    'functions',
    defaultFunctions(options),
    parseFunctions,
  );
  const filter = useMemo(() => new Set(stored), [stored]);
  const [showFilters, setShowFilters] = useState(false);
  return {
    filter,
    setFilter: (next: ReadonlySet<string>) => setStored([...next]),
    showFilters,
    toggleFilters: () => setShowFilters((v) => !v),
    activeFilters: filter.size > 0 ? 1 : 0,
  };
}
