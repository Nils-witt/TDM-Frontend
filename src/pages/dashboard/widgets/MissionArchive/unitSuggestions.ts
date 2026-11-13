import { useMemo, useState } from 'react';
import { type UnitList, unitLabel, unitsPath } from '@/api/units';
import { useResource } from '@/api/resource';
import type { Suggestion } from '@/components/SuggestInput';

const maxSuggestions = 20;

const fold = (s: string) => s.toLocaleLowerCase();

// Suggestions for the archive's Unit filter: the units server's units whose
// call sign or name contains the text, as the filter matches. Units no longer
// on the units server are not suggested but are still found by typing.
// Loaded only once the field is focused, as most searches do not use it.
export function useUnitSuggestions(text: string) {
  const [active, setActive] = useState(false);
  const [used, setUsed] = useState(false);
  if (active && !used) setUsed(true);
  const { data } = useResource<UnitList>(used ? unitsPath : null);

  const suggestions = useMemo<Suggestion[]>(() => {
    if (!active || !data?.enabled) return [];
    const needle = fold(text.trim());
    return data.units
      .filter((u) => needle === '' || [u.call_sign, u.name].some((v) => fold(v).includes(needle)))
      .map((u) => ({ unit: u, label: unitLabel(u) }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
      .slice(0, maxSuggestions)
      .map(({ unit, label }) => ({
        key: unit.id,
        value: label,
        detail: label !== unit.name ? unit.name : undefined,
      }));
  }, [active, data, text]);

  return { suggestions, onActive: setActive };
}
