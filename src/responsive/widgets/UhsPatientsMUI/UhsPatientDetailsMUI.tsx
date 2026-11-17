import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import type { Patient, PatientStay } from '@/api/patients';
import { ConfirmDialogMUI } from '../shared/DialogsMUI';
import { MutedMUI } from '../shared/FormMUI';

const when = (ts: string) => new Date(ts).toLocaleString();

// Below the patient's form on the UHS view: its missions by name, its stays
// (from, to, by whom) and Remove from UHS with a confirmation.
function UhsPatientDetailsMUI({
  patient: p,
  stays,
  canRemove,
  onRemove,
}: {
  patient: Patient;
  stays: readonly PatientStay[];
  canRemove: boolean;
  onRemove: () => Promise<void>;
}) {
  const [confirm, setConfirm] = useState(false);
  // An UHS session sees every mission by name only (other_missions).
  const missions = (p.other_missions ?? []).map((m) => m.name || 'Untitled mission');
  return (
    <Stack spacing={2} sx={{ mt: 3 }}>
      <div>
        <Typography variant="subtitle1">Missions</Typography>
        <MutedMUI>
          {p.missions.length + missions.length === 0 ? 'Walk-in: no mission.' : missions.join(', ')}
        </MutedMUI>
      </div>
      <div>
        <Typography variant="subtitle1">UHS stays</Typography>
        {stays.length === 0 ? (
          <MutedMUI>None.</MutedMUI>
        ) : (
          <List dense disablePadding>
            {stays.map((s) => (
              <ListItem key={s.id} disableGutters>
                <ListItemText
                  primary={s.uhs_name}
                  secondary={`${when(s.assigned_at)} – ${s.released_at ? when(s.released_at) : 'now'} · ${s.created_by}`}
                />
              </ListItem>
            ))}
          </List>
        )}
      </div>
      {p.uhs && (
        <div>
          <Button
            variant="outlined"
            color="error"
            disabled={!canRemove}
            onClick={() => setConfirm(true)}
          >
            Remove from {p.uhs.name}
          </Button>
        </div>
      )}
      {confirm && p.uhs && (
        <ConfirmDialogMUI
          title="Remove from UHS"
          message={`The patient leaves ${p.uhs.name} and this list.`}
          confirmLabel="Remove"
          onConfirm={onRemove}
          onCancel={() => setConfirm(false)}
        />
      )}
    </Stack>
  );
}

export default UhsPatientDetailsMUI;
