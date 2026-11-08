import { useCatalogs } from '@/data/catalogContext';

// "Group / Type", or what is known of it while the catalogs load.
export function useMissionTypeName(typeId: string | null): string {
  const { missionTypes, missionTypeGroups } = useCatalogs();
  if (typeId === null) return '';
  const type = missionTypes.byId.get(typeId);
  if (!type) return '';
  const group = missionTypeGroups.byId.get(type.group_id);
  return group ? `${group.name} / ${type.name}` : type.name;
}
