import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import {
  type Message,
  type MessagePriority,
  type MessageReceiverOption,
  maxMessageOrigin,
  maxMessageText,
} from '@/api/messages';
import { usePriorityLabels } from '@/data/messages';
import { useMessageCompose } from '@/pages/dashboard/widgets/Messages/messagesState';
import { FormActionsMUI, FormErrorMUI, FormMUI, FormSectionMUI, MutedMUI } from '../shared/FormMUI';
import { TagSelectMUI } from './MessagePartsMUI';

// To and CC as multi-selects that never offer a function in both; the
// always-CC functions are fixed chips in CC.
function MessageComposeMUI({ onSent }: { onSent: (m: Message) => void }) {
  const c = useMessageCompose(onSent);
  const labels = usePriorityLabels();
  const all = c.receivers.data ?? [];
  const disabled = c.blocker !== null || c.busy;
  const picked = (ids: readonly string[]) =>
    ids.flatMap((id) => all.find((r) => r.id === id) ?? []);
  const ids = (rs: readonly MessageReceiverOption[]) => rs.map((r) => r.id);

  return (
    <FormMUI
      onSubmit={(e) => {
        e.preventDefault();
        void c.send();
      }}
    >
      {c.blocker && <MutedMUI>{c.blocker}</MutedMUI>}
      <FormSectionMUI legend="New message" disabled={disabled}>
        <Autocomplete
          multiple
          options={c.options.to}
          value={picked(c.to)}
          getOptionLabel={(r) => r.name}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          disabled={disabled}
          onChange={(_, v) => c.setTo(ids(v))}
          renderInput={(params) => (
            <TextField {...params} label="To" required={c.to.length === 0} />
          )}
        />
        <Autocomplete
          multiple
          options={c.options.cc}
          value={picked(c.cc)}
          getOptionLabel={(r) => r.name}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          disabled={disabled}
          onChange={(_, v) => c.setCc(ids(v))}
          renderInput={(params) => <TextField {...params} label="CC" />}
        />
        {c.options.fixedCc.length > 0 && (
          <Stack direction="row" useFlexGap sx={{ gap: 0.5, flexWrap: 'wrap' }}>
            {c.options.fixedCc.map((r) => (
              <Chip
                key={r.id}
                size="small"
                variant="outlined"
                label={`CC ${r.name}`}
                title="Always CC: added to every message"
              />
            ))}
          </Stack>
        )}
        <TextField
          select
          label="Priority"
          value={c.priority}
          disabled={disabled}
          onChange={(e) => c.setPriority(Number(e.target.value) as MessagePriority)}
        >
          {labels.map((l, i) => (
            <MenuItem key={i} value={i + 1}>
              {l}
            </MenuItem>
          ))}
        </TextField>
        {c.ways.length > 0 && (
          <TextField
            select
            label="Transmission"
            value={c.wayId}
            disabled={disabled}
            // A Select hides the empty value's item and floats the label
            // over it unless told to show it.
            slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
            onChange={(e) => c.setWayId(e.target.value)}
          >
            <MenuItem value="">Chat only</MenuItem>
            {c.ways.map((w) => (
              <MenuItem key={w.id} value={w.id}>
                {w.name}
              </MenuItem>
            ))}
          </TextField>
        )}
        <TextField
          label="Origin"
          value={c.origin}
          disabled={disabled}
          slotProps={{ htmlInput: { maxLength: maxMessageOrigin } }}
          onChange={(e) => c.setOrigin(e.target.value)}
        />
        <TextField
          label="Text"
          multiline
          minRows={4}
          required
          value={c.text}
          disabled={disabled}
          slotProps={{ htmlInput: { maxLength: maxMessageText } }}
          onChange={(e) => c.setText(e.target.value)}
        />
        {c.tags.length > 0 && (
          <TagSelectMUI
            choices={c.tags}
            value={c.tagIds}
            disabled={disabled}
            onChange={c.setTagIds}
          />
        )}
      </FormSectionMUI>
      <FormActionsMUI
        submitLabel="Send"
        busy={c.busy}
        canSubmit={c.canSend}
        dirty={c.text !== '' || c.to.length > 0}
        onDiscard={c.reset}
      />
      <FormErrorMUI error={c.error ?? c.receivers.error} onClose={c.clearError} />
    </FormMUI>
  );
}

export default MessageComposeMUI;
