import { useState } from 'react';
import { SuggestInput } from '@/components/SuggestInput';
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
// "Unknown type" until another is picked. The type's description is shown in
// the field, so the form keeps its height whichever type is set.
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
  // While typing, only the type the text names, not the stored one.
  const shown =
    text === null
      ? value === null
        ? undefined
        : byId.get(value)
      : resolveMissionType(options, text);
  const description = shown?.description ?? '';

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
      hint={firstLine(description) || undefined}
      title={description || undefined}
      suggestions={matches.map((o) => ({
        key: o.id,
        value: o.label,
        detail: firstLine(o.description) || undefined,
        onPick: () => onChange(o.id),
      }))}
    />
  );
}
