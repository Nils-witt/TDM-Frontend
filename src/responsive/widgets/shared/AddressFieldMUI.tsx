import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { Suggestion } from '@/components/SuggestInput';

type Props = {
  label: string;
  value: string;
  onChange: (text: string) => void;
  suggestions: Suggestion[];
  onActive?: (active: boolean) => void;
  disabled?: boolean;
};

// As SuggestInput: any text can be typed in, suggestions never restrict it;
// picking one also fills in what it knows (onPick).
function AddressFieldMUI({ label, value, onChange, suggestions, onActive, disabled }: Props) {
  // An option equal to the text adds nothing, unless others share its value.
  const shown = suggestions.length === 1 && suggestions[0]?.value === value ? [] : suggestions;
  return (
    <Autocomplete<Suggestion, false, false, true>
      freeSolo
      disabled={disabled}
      options={shown}
      // Already narrowed by the API for the typed text.
      filterOptions={(o) => o}
      getOptionLabel={(o) => (typeof o === 'string' ? o : o.value)}
      getOptionKey={(o) => (typeof o === 'string' ? o : o.key)}
      inputValue={value}
      value={null}
      onInputChange={(_, text, reason) => {
        if (reason === 'input' || reason === 'clear') onChange(text);
      }}
      onChange={(_, picked) => {
        if (picked === null) return;
        if (typeof picked === 'string') {
          onChange(picked);
          return;
        }
        onChange(picked.value);
        picked.onPick?.();
      }}
      onFocus={() => onActive?.(true)}
      onBlur={() => onActive?.(false)}
      renderOption={({ key, ...props }, o) => (
        <Box component="li" key={key} {...props} sx={{ gap: 1, justifyContent: 'space-between' }}>
          <span>{o.value}</span>
          {o.detail && (
            <Typography component="span" variant="body2" color="text.secondary">
              {o.detail}
            </Typography>
          )}
        </Box>
      )}
      renderInput={(params) => <TextField {...params} label={label} size="small" />}
    />
  );
}

export default AddressFieldMUI;
