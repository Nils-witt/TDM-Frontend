import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  acknowledgementProgress,
  addressLine,
  awaitsAcknowledgement,
  type Message,
} from '@/api/messages';
import type { MessageTag } from '@/api/messageTags';
import { tagsOf } from '@/pages/dashboard/widgets/Messages/messagesState';
import { formatTime } from '@/pages/dashboard/widgets/shared/logbookEntries';
import { MutedMUI } from '../shared/FormMUI';
import { PriorityChipMUI, TagChipsMUI } from './MessagePartsMUI';

// The messages of a box, newest first; one the session's function has yet to
// acknowledge is bold and says so.
function MessageListMUI({
  messages,
  functionId,
  tagsById,
  onOpen,
}: {
  messages: readonly Message[];
  functionId: string | null;
  tagsById: ReadonlyMap<string, MessageTag>;
  onOpen: (m: Message) => void;
}) {
  if (messages.length === 0) return <MutedMUI>No messages.</MutedMUI>;
  return (
    <List disablePadding>
      {messages.map((m) => {
        const pending = awaitsAcknowledgement(m, functionId);
        const progress = acknowledgementProgress(m);
        return (
          <ListItemButton
            key={m.id}
            divider
            onClick={() => onOpen(m)}
            sx={{ alignItems: 'flex-start' }}
          >
            <ListItemText
              primary={
                <Stack
                  direction="row"
                  useFlexGap
                  sx={{ gap: 1, alignItems: 'center', flexWrap: 'wrap' }}
                >
                  <PriorityChipMUI priority={m.priority} />
                  <Typography component="span" sx={{ fontWeight: pending ? 600 : 400 }} noWrap>
                    {addressLine(m)}
                  </Typography>
                </Stack>
              }
              secondary={
                <Stack component="span" useFlexGap sx={{ gap: 0.5, mt: 0.5 }}>
                  <Typography
                    component="span"
                    variant="body2"
                    sx={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      color: 'text.primary',
                    }}
                  >
                    {m.text}
                  </Typography>
                  <TagChipsMUI tags={tagsOf(m, tagsById)} />
                  <Typography component="span" variant="caption">
                    {formatTime(m.created_at)}
                    {pending && ' · To acknowledge'}
                    {progress && ` · ${progress} acknowledged`}
                  </Typography>
                </Stack>
              }
              slotProps={{ secondary: { component: 'span' } }}
            />
          </ListItemButton>
        );
      })}
    </List>
  );
}

export default MessageListMUI;
