import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import type { Theme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useId, useState } from 'react';
import {
  type BackupInstanceStatus,
  type BackupJob,
  type BackupState,
  type BackupStatus,
  summarizeBackup,
} from '@/api/backup';
import SymbolIcon from '@/components/symbols/SymbolIcon';
import { backupLevelState, backupStateLabels } from '@/nav/actions/backupLabels';
import { formatTime } from '@/pages/dashboard/widgets/shared/logbookEntries';

const dotColor: Record<BackupState, string> = {
  idle: 'text.disabled',
  running: 'info.main',
  ok: 'success.main',
  incomplete: 'warning.main',
  failed: 'error.main',
};

// As the menu bar's BackupIndicator menu: a heading per instance with its
// jobs below; tapping a job shows its targets. Fills a phone's screen. While
// the API cannot be reached, the last answer stays listed below the error.
function BackupStatusDialogMUI({
  status,
  error,
  title,
  onRefresh,
  onClose,
}: {
  status: BackupStatus;
  error: string | null;
  title: string;
  onRefresh: () => void;
  onClose: () => void;
}) {
  const id = useId();
  const phone = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));
  // A copy stored by an older version has no instances.
  const instances = status.instances ?? [];
  return (
    <Dialog open onClose={onClose} aria-labelledby={id} fullWidth fullScreen={phone} maxWidth="sm">
      <DialogTitle id={id}>{title}</DialogTitle>
      <DialogContent dividers sx={{ px: 0 }}>
        {error !== null && (
          <Alert severity="error" sx={{ mx: 2, mb: 1, whiteSpace: 'pre-wrap' }}>
            {error}
          </Alert>
        )}
        {instances.map((instance) => (
          <Instance key={instance.id} instance={instance} />
        ))}
      </DialogContent>
      <DialogActions sx={{ pb: phone ? 'calc(8px + env(safe-area-inset-bottom))' : undefined }}>
        {status.checked_at && (
          <Typography variant="body2" color="text.secondary" sx={{ mr: 'auto', pl: 1 }}>
            Checked {formatTime(status.checked_at)}
          </Typography>
        )}
        <Button onClick={onRefresh}>Refresh</Button>
        <Button variant="contained" onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function Instance({ instance }: { instance: BackupInstanceStatus }) {
  const { level } = summarizeBackup([instance], false);
  return (
    <Box component="section" sx={{ '& + &': { borderTop: 1, borderColor: 'divider' }, py: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.5 }}>
        <Dot state={backupLevelState[level]} />
        <Typography variant="subtitle2" component="h3">
          {instance.name}
        </Typography>
      </Box>
      {instance.error ? (
        <Typography variant="body2" color="error" sx={{ px: 2, pl: 4, whiteSpace: 'pre-wrap' }}>
          {instance.error}
        </Typography>
      ) : instance.jobs.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ px: 2, pl: 4 }}>
          No configured job found
        </Typography>
      ) : (
        <List dense disablePadding>
          {instance.jobs.map((job) => (
            <Job key={job.name} job={job} />
          ))}
        </List>
      )}
    </Box>
  );
}

function Job({ job }: { job: BackupJob }) {
  const [expanded, setExpanded] = useState(false);
  const lastRun = job.last_end ? formatTime(job.last_end) : 'never';
  return (
    <>
      <ListItemButton
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        sx={{ gap: 1.5, pl: 4 }}
      >
        <Dot state={job.state} />
        <ListItemText
          primary={job.name}
          secondary={`${backupStateLabels[job.state] ?? job.state} · last run ${lastRun}`}
        />
        <SymbolIcon name={expanded ? 'expand_less' : 'expand_more'} />
      </ListItemButton>
      <Collapse in={expanded} unmountOnExit>
        <Box sx={{ pl: 7, pr: 2, pb: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {job.error && (
            <Typography variant="body2" color="error" sx={{ whiteSpace: 'pre-wrap' }}>
              {job.error}
            </Typography>
          )}
          {job.targets.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No targets
            </Typography>
          )}
          {job.targets.map((t) => (
            <Box key={`${t.server}/${t.bucket}`}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Dot state={t.state} />
                <Typography variant="body2" sx={{ flexGrow: 1, overflowWrap: 'anywhere' }}>
                  {t.server} / {t.bucket}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {backupStateLabels[t.state] ?? t.state}
                </Typography>
              </Box>
              {t.error && (
                <Typography
                  variant="body2"
                  color="error"
                  sx={{ pl: 2, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
                >
                  {t.error}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      </Collapse>
    </>
  );
}

function Dot({ state }: { state: BackupState }) {
  return (
    <Box
      aria-hidden="true"
      sx={{
        flexShrink: 0,
        width: 8,
        height: 8,
        borderRadius: '50%',
        bgcolor: dotColor[state] ?? 'text.disabled',
      }}
    />
  );
}

export default BackupStatusDialogMUI;
