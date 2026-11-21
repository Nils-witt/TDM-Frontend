import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { ccReceivers, type Message, toReceivers } from '@/api/messages';
import { activeTags, type MessageTag } from '@/api/messageTags';
import { useMessageActions } from '@/pages/dashboard/widgets/Messages/messagesState';
import { formatTime } from '@/pages/dashboard/widgets/shared/logbookEntries';
import { FormActionsMUI, FormErrorMUI, FormMUI, FormSectionMUI, MutedMUI } from '../shared/FormMUI';
import { PriorityChipMUI, TagChipMUI } from './MessagePartsMUI';

// One message: its text, each receiver with who acknowledged when,
// Acknowledge for a pending To receiver, and the tags (the only change).
function MessageDetailMUI({
  message: m,
  tags,
  onChanged,
}: {
  message: Message;
  tags: readonly MessageTag[];
  onChanged: (m: Message) => void;
}) {
  const actions = useMessageActions(m, onChanged);
  return (
    <Stack useFlexGap sx={{ gap: 2 }}>
      <Stack direction="row" useFlexGap sx={{ gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        <PriorityChipMUI priority={m.priority} />
        <Typography variant="subtitle1">{m.sender.name}</Typography>
        <Typography variant="caption" color="text.secondary">
          {formatTime(m.created_at)} · {m.created_by}
          {m.transmission_way && ` · via ${m.transmission_way.name}`}
        </Typography>
      </Stack>
      <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{m.text}</Typography>
      {actions.canAcknowledge && (
        <Button variant="contained" disabled={actions.busy} onClick={actions.acknowledge}>
          Acknowledge
        </Button>
      )}
      <FormErrorMUI error={actions.error} onClose={actions.clearError} />
      <div>
        <Typography variant="overline" color="text.secondary">
          Receivers
        </Typography>
        <List dense disablePadding>
          {[...toReceivers(m), ...ccReceivers(m)].map((r) => (
            <ListItem key={r.function.id} disableGutters>
              <ListItemText
                primary={`${r.kind === 'to' ? 'To' : 'CC'}: ${r.function.name}`}
                secondary={
                  r.kind === 'cc'
                    ? 'For information'
                    : r.acknowledged_at
                      ? `Acknowledged ${formatTime(r.acknowledged_at)} · ${r.acknowledged_by ?? ''}`
                      : 'Not acknowledged'
                }
              />
            </ListItem>
          ))}
        </List>
      </div>
      <TagEditorMUI
        key={m.updated_at}
        current={m.tags}
        tags={tags}
        disabled={!actions.canTag || actions.busy}
        onSave={actions.setTags}
      />
    </Stack>
  );
}

function TagEditorMUI({
  current,
  tags,
  disabled,
  onSave,
}: {
  current: readonly string[];
  tags: readonly MessageTag[];
  disabled: boolean;
  onSave: (ids: string[]) => void;
}) {
  const [draft, setDraft] = useState<string[] | null>(null);
  const chosen = draft ?? [...current];
  // A deleted tag the message has stays offered until removed.
  const choices = [...activeTags(tags), ...tags.filter((t) => t.deleted && current.includes(t.id))];
  return (
    <FormMUI
      onSubmit={(e) => {
        e.preventDefault();
        if (draft) onSave(draft);
        setDraft(null);
      }}
    >
      <FormSectionMUI legend="Tags" disabled={disabled}>
        {choices.length === 0 && <MutedMUI>No tags in this scope.</MutedMUI>}
        {choices.map((t) => (
          <FormControlLabel
            key={t.id}
            control={
              <Checkbox
                checked={chosen.includes(t.id)}
                disabled={disabled}
                onChange={(e) =>
                  setDraft(e.target.checked ? [...chosen, t.id] : chosen.filter((x) => x !== t.id))
                }
              />
            }
            label={<TagChipMUI tag={t} />}
          />
        ))}
      </FormSectionMUI>
      <FormActionsMUI
        submitLabel="Save tags"
        canSubmit={draft !== null && !disabled}
        dirty={draft !== null}
        onDiscard={() => setDraft(null)}
      />
    </FormMUI>
  );
}

export default MessageDetailMUI;
