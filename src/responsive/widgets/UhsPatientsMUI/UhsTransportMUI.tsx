import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import type { MissionType } from '@/api/catalogs';
import { isTransportOpen, type TransportRequest } from '@/api/transports';
import { useCatalogs } from '@/data/catalogContext';
import { useMissionTypeName } from '@/data/missionTypeName';
import StatusChip from '../../StatusChip';
import { DialogShell } from '../shared/DialogsMUI';
import { MutedMUI } from '../shared/FormMUI';

// The mission types offered for transport requests, as "Group / Type".
function useTransportTypes(): { id: string; label: string }[] {
  const { missionTypes, missionTypeGroups } = useCatalogs();
  const label = (t: MissionType) => {
    const group = missionTypeGroups.byId.get(t.group_id);
    return group ? `${group.name} / ${t.name}` : t.name;
  };
  return missionTypes.items
    .filter((t) => t.transport_request === true)
    .map((t) => ({ id: t.id, label: label(t) }))
    .toSorted((a, b) => a.label.localeCompare(b.label));
}

// On the UHS view's patient page: the patient's newest transport request with
// a button to its page (destination), and Request transport (blocked tells
// why not, e.g. while inbound or one is open).
function UhsTransportMUI({
  transport,
  blocked,
  onRequest,
  onOpen,
}: {
  // null without one, undefined while loading.
  transport: TransportRequest | null | undefined;
  blocked: string | null;
  onRequest: (missionType: string) => Promise<void>;
  onOpen: () => void;
}) {
  const [requesting, setRequesting] = useState(false);
  const typeName = useMissionTypeName(transport?.mission.mission_type ?? null);
  const open = transport ? isTransportOpen(transport) : false;

  return (
    <div>
      <Typography variant="subtitle1">Transport</Typography>
      {transport ? (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', my: 1, flexWrap: 'wrap' }}>
          <span>{typeName || transport.mission.occurred_event}</span>
          <StatusChip status={transport.mission.status} />
          <MutedMUI>
            requested {new Date(transport.created_at).toLocaleString()} · {transport.created_by}
          </MutedMUI>
        </Stack>
      ) : (
        transport === null && <MutedMUI>None requested.</MutedMUI>
      )}
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mt: 1 }}>
        {transport && (
          <Button variant={open ? 'contained' : 'outlined'} onClick={onOpen}>
            {open ? 'Transport & destination' : 'View transport'}
          </Button>
        )}
        {!open && (
          <Button
            variant={transport ? 'contained' : 'outlined'}
            disabled={blocked !== null}
            onClick={() => setRequesting(true)}
          >
            Request transport
          </Button>
        )}
      </Stack>
      {blocked && !open && transport !== undefined && <MutedMUI>{blocked}</MutedMUI>}
      {requesting && (
        <RequestTransportDialogMUI onRequest={onRequest} onCancel={() => setRequesting(false)} />
      )}
    </div>
  );
}

// The mission type is required; the destination follows on the transport's
// page.
function RequestTransportDialogMUI({
  onRequest,
  onCancel,
}: {
  onRequest: (missionType: string) => Promise<void>;
  onCancel: () => void;
}) {
  const types = useTransportTypes();
  const [type, setType] = useState(types.length === 1 ? (types[0]?.id ?? '') : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancel = () => {
    if (!busy) onCancel();
  };

  return (
    <DialogShell
      title="Request transport"
      onCancel={cancel}
      onSubmit={(e) => {
        e.preventDefault();
        if (type === '' || busy) return;
        setBusy(true);
        setError(null);
        // Unmounted by the parent on success.
        onRequest(type).catch((err: unknown) => {
          setError(err instanceof Error ? err.message : String(err));
          setBusy(false);
        });
      }}
    >
      <DialogContent>
        {types.length === 0 ? (
          <Alert severity="warning">
            No mission type is offered for transport requests. Ask an administrator to mark one.
          </Alert>
        ) : (
          <TextField
            select
            label="Mission type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            required
            fullWidth
            disabled={busy}
            margin="dense"
          >
            {types.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.label}
              </MenuItem>
            ))}
          </TextField>
        )}
        <DialogContentText variant="body2" sx={{ mt: 1 }}>
          Creates a mission at this UHS's address with the patient. Fill in the destination next.
        </DialogContentText>
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={cancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={busy || type === ''}>
          Request
        </Button>
      </DialogActions>
    </DialogShell>
  );
}

export default UhsTransportMUI;
