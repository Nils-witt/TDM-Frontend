import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useState } from 'react';
import { type MissionStatus, missionStatuses } from '@/api/missions';
import { useCatalogs } from '@/data/catalogContext';

// As StatusSelect: once the stored status left draft, the API does not let it
// return; a status unknown to this build is kept as an extra option.
export function StatusSelectMUI({
  value,
  stored,
  onChange,
  disabled,
}: {
  value: string;
  stored: string;
  onChange: (v: MissionStatus) => void;
  disabled?: boolean;
}) {
  const known = missionStatuses.some((s) => s.value === value);
  return (
    <TextField
      select
      label="Status"
      size="small"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as MissionStatus)}
    >
      {!known && <MenuItem value={value}>{value}</MenuItem>}
      {missionStatuses.map((s) => (
        <MenuItem
          key={s.value}
          value={s.value}
          disabled={s.value === 'draft' && stored !== 'draft'}
        >
          {s.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

// As MissionTypeInputs: the type is what is saved, the group only narrows the
// types offered; a deleted type shows as "Unknown type" until another is
// picked.
export function MissionTypeInputsMUI({
  value,
  onChange,
  disabled,
}: {
  value: string | null;
  onChange: (typeId: string | null) => void;
  disabled?: boolean;
}) {
  const { missionTypes, missionTypeGroups } = useCatalogs();
  const type = value === null ? undefined : missionTypes.byId.get(value);
  const [pickedGroup, setPickedGroup] = useState<string | null>(null);
  const group = pickedGroup ?? type?.group_id ?? '';
  const groups = [...missionTypeGroups.items].sort((a, b) => a.name.localeCompare(b.name));
  const types = missionTypes.items
    .filter((t) => t.group_id === group)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <TextField
        select
        label="Group"
        size="small"
        value={group}
        disabled={disabled}
        onChange={(e) => {
          setPickedGroup(e.target.value);
          if (type?.group_id !== e.target.value) onChange(null);
        }}
        slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
      >
        <MenuItem value="">No type</MenuItem>
        {groups.map((g) => (
          <MenuItem key={g.id} value={g.id}>
            {g.name}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label="Type"
        size="small"
        value={value ?? ''}
        disabled={disabled || (group === '' && value === null)}
        onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
        slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
      >
        <MenuItem value="">{group === '' ? '-' : 'Choose a type…'}</MenuItem>
        {value !== null && !type && <MenuItem value={value}>Unknown type</MenuItem>}
        {types.map((t) => (
          <MenuItem key={t.id} value={t.id}>
            {t.name}
          </MenuItem>
        ))}
      </TextField>
    </>
  );
}
