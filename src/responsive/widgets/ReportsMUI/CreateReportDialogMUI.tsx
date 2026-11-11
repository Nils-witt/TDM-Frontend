import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import type { Mission } from '@/api/missions';
import type { Report } from '@/api/reports';
import { useCreateReport } from '@/pages/dashboard/widgets/Reports/useCreateReport';
import { DialogShell } from '../shared/DialogsMUI';
import { FormErrorMUI } from '../shared/FormMUI';

// As CreateReportDialog: of a done or closed mission; the API generates the PDF.
function CreateReportDialogMUI({
  missions,
  missionId,
  onCreated,
  onClose,
}: {
  missions: readonly Mission[];
  missionId: string | null;
  onCreated: (r: Report) => void;
  onClose: () => void;
}) {
  const s = useCreateReport({ missions, missionId, onCreated });
  const close = () => {
    if (!s.busy) onClose();
  };
  return (
    <DialogShell
      title="Create report"
      maxWidth="sm"
      onCancel={close}
      onSubmit={(e) => {
        e.preventDefault();
        void s.submit();
      }}
    >
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <DialogContentText variant="body2">
          The API renders the mission with the template as a PDF and stores it with the data it was
          made from. Reports are made of done or closed missions only.
        </DialogContentText>
        {s.finished.length === 0 ? (
          <DialogContentText variant="body2">No done or closed missions.</DialogContentText>
        ) : (
          <TextField
            select
            label="Mission"
            size="small"
            value={s.mission}
            onChange={(e) => s.setPickedMission(e.target.value)}
            sx={{ mt: 1 }}
          >
            {s.finished.map((m) => (
              <MenuItem key={m.id} value={m.id}>
                {m.occurred_event}
              </MenuItem>
            ))}
          </TextField>
        )}
        {s.sortedTemplates.length === 0 && s.templates.error === null ? (
          <DialogContentText variant="body2">
            {s.templates.loading
              ? 'Loading templates…'
              : 'No export templates yet: an admin adds them.'}
          </DialogContentText>
        ) : (
          <TextField
            select
            label="Template"
            size="small"
            value={s.template}
            onChange={(e) => s.setPickedTemplate(e.target.value)}
          >
            {s.sortedTemplates.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.name}
              </MenuItem>
            ))}
          </TextField>
        )}
        <FormErrorMUI error={s.error ?? s.templates.error} onClose={() => s.setError(null)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={s.busy}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={s.busy || s.mission === '' || s.template === ''}
        >
          {s.busy ? 'Creating…' : 'Create'}
        </Button>
      </DialogActions>
    </DialogShell>
  );
}

export default CreateReportDialogMUI;
