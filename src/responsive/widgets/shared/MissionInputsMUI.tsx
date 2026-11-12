import Autocomplete from '@mui/material/Autocomplete';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { type MissionStatus, missionStatuses } from '@/api/missions';
import {
  type MissionTypeOption,
  matchMissionTypes,
  useMissionTypeOptions,
} from '@/pages/dashboard/widgets/shared/missionTypeOptions';

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

// As MissionTypeInput: one field for group and type, typing searches both
// (and the descriptions); the menu groups the types and adds their
// descriptions. A deleted type shows as "Unknown type" until another is
// picked.
export function MissionTypeInputMUI({
  value,
  onChange,
  disabled,
}: {
  value: string | null;
  onChange: (typeId: string | null) => void;
  disabled?: boolean;
}) {
  const { options, byId } = useMissionTypeOptions();
  const type = value === null ? null : (byId.get(value) ?? null);
  // Autocomplete's value has to be one of its options.
  const unknown: MissionTypeOption | null =
    value !== null && !type
      ? { id: value, label: 'Unknown type', name: 'Unknown type', group: '', description: '' }
      : null;

  return (
    <Autocomplete<MissionTypeOption, false, false, false>
      fullWidth
      autoHighlight
      disabled={disabled}
      options={unknown ? [unknown, ...options] : options}
      value={type ?? unknown}
      onChange={(_, picked) => onChange(picked?.id ?? null)}
      filterOptions={(o, { inputValue }) => matchMissionTypes(o, inputValue)}
      groupBy={(o) => o.group}
      getOptionLabel={(o) => o.label}
      getOptionKey={(o) => o.id}
      isOptionEqualToValue={(o, v) => o.id === v.id}
      noOptionsText="No matching type"
      renderOption={({ key, ...props }, o) => (
        <li key={key} {...props}>
          <ListItemText
            primary={o.name}
            secondary={o.description || undefined}
            slotProps={{ secondary: { sx: { whiteSpace: 'pre-line' } } }}
          />
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Type"
          size="small"
          placeholder="Search group or type…"
          helperText={type?.description || undefined}
          slotProps={{
            ...params.slotProps,
            formHelperText: { sx: { whiteSpace: 'pre-line' } },
          }}
        />
      )}
    />
  );
}
