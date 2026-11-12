import { useMemo } from 'react';
import { useCatalogs } from '@/data/catalogContext';

// label is "Group / Type", unique as the API keeps type names unique per group.
export type MissionTypeOption = {
  id: string;
  label: string;
  name: string;
  group: string;
  description: string;
};

// Sorted by group, then type, so grouped lists need no further sorting.
export function useMissionTypeOptions(): {
  options: MissionTypeOption[];
  byId: Map<string, MissionTypeOption>;
} {
  const { missionTypes, missionTypeGroups } = useCatalogs();
  return useMemo(() => {
    const options = missionTypes.items
      .map((t) => {
        const group = missionTypeGroups.byId.get(t.group_id)?.name ?? '';
        return {
          id: t.id,
          label: group ? `${group} / ${t.name}` : t.name,
          name: t.name,
          group,
          description: t.description ?? '',
        };
      })
      .sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
    return { options, byId: new Map(options.map((o) => [o.id, o])) };
  }, [missionTypes.items, missionTypeGroups.byId]);
}

const fold = (s: string) => s.trim().toLocaleLowerCase();
// "Fire/Car" and "fire  /  car" mean "Fire / Car".
const foldLabel = (s: string) =>
  fold(s)
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s+/g, ' ');

// Every word of the text must occur in the group, type or description, in any
// order; types whose name starts with the text come first.
export function matchMissionTypes(options: MissionTypeOption[], text: string): MissionTypeOption[] {
  const words = fold(text)
    .split(/[\s/]+/)
    .filter(Boolean);
  if (words.length === 0) return options;
  const t = fold(text);
  const matches = options.filter((o) => {
    const haystack = fold(`${o.group} ${o.name} ${o.description}`);
    return words.every((w) => haystack.includes(w));
  });
  const leading = (o: MissionTypeOption) =>
    fold(o.name).startsWith(t) || foldLabel(o.label).startsWith(foldLabel(text));
  return [...matches.filter(leading), ...matches.filter((o) => !leading(o))];
}

// The type the text names: its full label, or a type name no other group
// shares. Undefined when it names none or is ambiguous.
export function resolveMissionType(
  options: MissionTypeOption[],
  text: string,
): MissionTypeOption | undefined {
  const label = foldLabel(text);
  if (label === '') return undefined;
  const exact = options.find((o) => foldLabel(o.label) === label);
  if (exact) return exact;
  const byName = options.filter((o) => fold(o.name) === label);
  return byName.length === 1 ? byName[0] : undefined;
}

export const firstLine = (s: string) => s.split('\n', 1)[0];
