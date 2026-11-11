import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import type { ReactNode } from 'react';
import { memberName, type User } from '@/api/directory';
import type { Report } from '@/api/reports';
import { useShareReport } from '@/pages/dashboard/widgets/Reports/useShareReport';
import { DialogShell } from '../shared/DialogsMUI';
import { FormErrorMUI, FormSectionMUI, MutedMUI } from '../shared/FormMUI';

// As ShareReportDialog: who else may read a report and its PDFs.
function ShareReportDialogMUI({
  report,
  event,
  users,
  onShared,
  onClose,
}: {
  report: Report;
  event: string;
  users: readonly User[];
  onShared: (r: Report) => void;
  onClose: () => void;
}) {
  const s = useShareReport({ report, users, onShared });
  const close = () => {
    if (!s.busy) onClose();
  };
  return (
    <DialogShell
      title="Share report"
      maxWidth="sm"
      onCancel={close}
      onSubmit={(e) => {
        e.preventDefault();
        void s.submit();
      }}
    >
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <DialogContentText variant="body2">
          Users and members of groups picked here may read the report on <strong>{event}</strong>{' '}
          and its PDFs. Only its creator or an admin uploads the signed PDF or changes this.
        </DialogContentText>
        <FormSectionMUI legend="Users">
          <TextField
            size="small"
            type="search"
            label="Find users"
            value={s.filter}
            onChange={(e) => s.setFilter(e.target.value)}
          />
          <CheckList label="Users">
            {s.shownUsers.length === 0 && <MutedMUI>No users found.</MutedMUI>}
            {s.shownUsers.map((u) => (
              <FormControlLabel
                key={u.id}
                control={
                  <Checkbox
                    size="small"
                    checked={s.userIds.includes(u.id)}
                    onChange={(e) => s.toggleUser(u.id, e.target.checked)}
                  />
                }
                label={`${memberName(u)}${u.disabled ? ' (disabled)' : ''}`}
              />
            ))}
          </CheckList>
        </FormSectionMUI>
        <FormSectionMUI legend="Groups">
          <CheckList label="Groups">
            {s.offeredGroups.length === 0 && <MutedMUI>No groups found.</MutedMUI>}
            {s.offeredGroups.map((name) => (
              <FormControlLabel
                key={name}
                control={
                  <Checkbox
                    size="small"
                    checked={s.groups.includes(name)}
                    onChange={(e) => s.toggleGroup(name, e.target.checked)}
                  />
                }
                label={name}
              />
            ))}
          </CheckList>
          <Stack direction="row" sx={{ gap: 1 }}>
            <TextField
              size="small"
              label="Other group name"
              value={s.typed}
              onChange={(e) => s.setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  s.addTyped();
                }
              }}
              slotProps={{ htmlInput: { maxLength: 200 } }}
              sx={{ flex: 1 }}
            />
            <Button onClick={s.addTyped} disabled={s.typed.trim() === ''}>
              Add
            </Button>
          </Stack>
        </FormSectionMUI>
        <FormErrorMUI error={s.error} onClose={() => s.setError(null)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={s.busy}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={!s.canSubmit || s.busy}>
          {s.busy ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </DialogShell>
  );
}

// A scrolling list of checkboxes, so long directories keep the dialog short.
function CheckList({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box
      role="group"
      aria-label={label}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '14rem',
        overflowY: 'auto',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        px: 1.5,
        py: 0.5,
      }}
    >
      {children}
    </Box>
  );
}

export default ShareReportDialogMUI;
