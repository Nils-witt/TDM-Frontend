import { useState } from 'react';
import { useCatalogs } from '@/data/catalogContext';
import styles from './MissionType.module.scss';

// The type is what is saved; the group only narrows the types offered. A type
// no longer in the catalog (deleted) stays shown as "Unknown type" until
// another is picked.
export function MissionTypeInputs({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: string | null;
  onChange: (typeId: string | null) => void;
}) {
  const { missionTypes, missionTypeGroups } = useCatalogs();
  const type = value === null ? undefined : missionTypes.byId.get(value);
  // Picked before a type of the group is: '' for none.
  const [pickedGroup, setPickedGroup] = useState<string | null>(null);
  const group = pickedGroup ?? type?.group_id ?? '';
  const groups = [...missionTypeGroups.items].sort((a, b) => a.name.localeCompare(b.name));
  const types = missionTypes.items
    .filter((t) => t.group_id === group)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <select
        id={id}
        className="grow"
        aria-label={id ? undefined : 'Type group'}
        value={group}
        onChange={(e) => {
          setPickedGroup(e.target.value);
          if (type?.group_id !== e.target.value) onChange(null);
        }}
      >
        <option value="">No type</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
      <select
        className="grow"
        aria-label="Type"
        value={value ?? ''}
        disabled={group === '' && value === null}
        onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
      >
        <option value="">{group === '' ? '-' : 'Choose a type…'}</option>
        {value !== null && !type && <option value={value}>Unknown type</option>}
        {types.map((t) => (
          <option key={t.id} value={t.id} title={t.description || undefined}>
            {t.name}
          </option>
        ))}
      </select>
    </>
  );
}

// Shown below MissionTypeInputs; nothing for a type without one.
export function MissionTypeDescription({ typeId }: { typeId: string | null }) {
  const { missionTypes } = useCatalogs();
  const description = typeId === null ? '' : (missionTypes.byId.get(typeId)?.description ?? '');
  if (description === '') return null;
  return <p className={styles.description}>{description}</p>;
}
