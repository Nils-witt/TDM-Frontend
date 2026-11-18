import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import {
  formatPatientName,
  isInbound,
  type Patient,
  patientRemovalTexts,
  type PatientStay,
  stayArrivalLabel,
  stayEndLabel,
} from '@/api/patients';
import { ConfirmDialogMUI, RevokeDialogMUI } from '../shared/DialogsMUI';
import { MutedMUI } from '../shared/FormMUI';

const when = (ts: string) => new Date(ts).toLocaleString();

// Below the patient's form on the UHS view: Arrived while it is inbound, its
// missions by name, its stays (from, arrived, to, by whom, how it ended),
// Check out for a patient that was there and leaves now (checkoutBlocked
// tells why not, e.g. while inbound) and Remove from UHS for one assigned in
// error or that never came, which asks for the reason.
function UhsPatientDetailsMUI({
  patient: p,
  stays,
  canRemove,
  checkoutBlocked,
  onRemove,
  onArrive,
  onCheckout,
}: {
  patient: Patient;
  stays: readonly PatientStay[];
  canRemove: boolean;
  checkoutBlocked: string | null;
  onRemove: (reason: string) => Promise<void>;
  onArrive: () => Promise<void>;
  onCheckout: () => Promise<void>;
}) {
  const [confirm, setConfirm] = useState(false);
  const [confirmCheckout, setConfirmCheckout] = useState(false);
  const [arriving, setArriving] = useState(false);
  const [arriveError, setArriveError] = useState<string | null>(null);
  // An UHS session sees every mission by name only (other_missions).
  const missions = (p.other_missions ?? []).map((m) => m.name || 'Untitled mission');
  return (
    <Stack spacing={2} sx={{ mt: 3 }}>
      {isInbound(p) && p.uhs && (
        <div>
          <MutedMUI>
            Inbound to {p.uhs.name}, assigned {when(p.uhs.since)}.
          </MutedMUI>
          <Button
            variant="contained"
            sx={{ mt: 1 }}
            disabled={!canRemove || arriving}
            onClick={() => {
              setArriving(true);
              void onArrive()
                .then(
                  () => setArriveError(null),
                  (err: unknown) =>
                    setArriveError(err instanceof Error ? err.message : String(err)),
                )
                .finally(() => setArriving(false));
            }}
          >
            Arrived
          </Button>
          {arriveError && (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {arriveError}
            </Typography>
          )}
        </div>
      )}
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
                  secondary={`${when(s.assigned_at)} – ${s.released_at ? when(s.released_at) : 'now'} · ${s.created_by} · arrived: ${stayArrivalLabel(s, when)}${stayEndLabel(s) ? ` · ${stayEndLabel(s)}` : ''}`}
                />
              </ListItem>
            ))}
          </List>
        )}
      </div>
      {p.uhs && (
        <div>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              disabled={checkoutBlocked !== null}
              onClick={() => setConfirmCheckout(true)}
            >
              Check out
            </Button>
            <Button
              variant="outlined"
              color="error"
              disabled={!canRemove}
              onClick={() => setConfirm(true)}
            >
              Remove from {p.uhs.name}
            </Button>
          </Stack>
          {/* While inbound the patient never was there: only Remove applies. */}
          {checkoutBlocked && isInbound(p) && (
            <MutedMUI>Check out after the patient has arrived.</MutedMUI>
          )}
        </div>
      )}
      {confirmCheckout && p.uhs && (
        <ConfirmDialogMUI
          title="Check out patient"
          message={`${formatPatientName(p)} was in ${p.uhs.name} and leaves now. The stay ends and the patient leaves this list.`}
          confirmLabel="Check out"
          onConfirm={onCheckout}
          onCancel={() => setConfirmCheckout(false)}
        />
      )}
      {confirm && p.uhs && (
        <RevokeDialogMUI
          {...patientRemovalTexts.release}
          note={`The patient leaves ${p.uhs.name} and this list. ${patientRemovalTexts.release.note}`}
          subject={formatPatientName(p)}
          onRevoke={onRemove}
          onCancel={() => setConfirm(false)}
        />
      )}
    </Stack>
  );
}

export default UhsPatientDetailsMUI;
