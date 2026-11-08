import type { ResolvedOptions, WidgetOption } from '../widgetOptions';
import type { PartyFilter, TypeFilter } from './logbookEntries';

// Empty ones filter nothing.
export const logbookFilterOptions: WidgetOption[] = [
  { key: 'filterTypes', label: 'Default type filter', type: 'logbookTypes', default: [] },
  { key: 'filterSender', label: 'Default sender filter', type: 'text', default: '' },
  { key: 'filterReceiver', label: 'Default receiver filter', type: 'text', default: '' },
];

export type DefaultFilters = { types: TypeFilter; parties: PartyFilter };

export function defaultFilters(options: ResolvedOptions): DefaultFilters {
  const types = options.filterTypes;
  return {
    types: new Set(Array.isArray(types) ? types.map(String) : []),
    parties: {
      sender: String(options.filterSender ?? ''),
      receiver: String(options.filterReceiver ?? ''),
    },
  };
}

// For remounting a widget, and so resetting its filters, when they change.
export const filtersKey = (f: DefaultFilters) =>
  JSON.stringify([[...f.types].sort(), f.parties.sender, f.parties.receiver]);
