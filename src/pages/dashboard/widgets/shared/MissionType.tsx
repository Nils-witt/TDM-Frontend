import { useState } from 'react';
import { SuggestInput } from '@/components/SuggestInput';
import { useCatalogs } from '@/data/catalogContext';
import styles from './MissionType.module.scss';
import {
  firstLine,
  matchMissionTypes,
  resolveMissionType,
  useMissionTypeOptions,
} from './missionTypeOptions';

// One field for group and type: typing searches both (and the descriptions),
// and the type is set as soon as the text names one (see resolveMissionType);
// emptying it clears the type. Text naming none is dropped on blur, showing
// the stored type again. A type no longer in the catalog (deleted) shows as
// "Unknown type" until another is picked.
export function MissionTypeInput({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: string | null;
  onChange: (typeId: string | null) => void;
}) {
  const { options, byId } = useMissionTypeOptions();
  const current = value === null ? '' : (byId.get(value)?.label ?? 'Unknown type');
  // null while not typing, so the field follows the value.
  const [text, setText] = useState<string | null>(null);
  // Until something is typed, every type is offered.
  const matches = text === null ? options : matchMissionTypes(options, text);

  return (
    <SuggestInput
      id={id}
      className="grow"
      aria-label={id ? undefined : 'Mission type'}
      placeholder="Search group or type…"
      value={text ?? current}
      onChange={(t) => {
        setText(t);
        if (t.trim() === '') {
          onChange(null);
          return;
        }
        const picked = resolveMissionType(options, t);
        if (picked) onChange(picked.id);
      }}
      onBlur={() => setText(null)}
      suggestions={matches.map((o) => ({
        key: o.id,
        value: o.label,
        detail: firstLine(o.description) || undefined,
        onPick: () => onChange(o.id),
      }))}
    />
  );
}

// Shown below MissionTypeInput; nothing for a type without one.
export function MissionTypeDescription({ typeId }: { typeId: string | null }) {
  const { missionTypes } = useCatalogs();
  const description = typeId === null ? '' : (missionTypes.byId.get(typeId)?.description ?? '');
  if (description === '') return null;
  return <p className={styles.description}>{description}</p>;
}
