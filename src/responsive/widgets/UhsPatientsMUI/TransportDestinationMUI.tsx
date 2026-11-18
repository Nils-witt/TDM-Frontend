import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { type FormEvent, useState } from 'react';
import type { TransportDestination, TransportRequest } from '@/api/transports';
import { useMissionTypeName } from '@/data/missionTypeName';
import {
  addressChanges,
  addressValues,
  useAddressEdits,
} from '@/pages/dashboard/widgets/shared/addressEdits';
import StatusChip from '../../StatusChip';
import AddressFieldsetMUI from '../shared/AddressFieldsetMUI';
import { FormActionsMUI, FormErrorMUI, FormMUI, MutedMUI } from '../shared/FormMUI';

const addressLine = (r: TransportRequest) => {
  const a = addressValues(r.mission, 'address_');
  return (
    [a.object_name, [a.street, a.house_number].filter(Boolean).join(' '), a.city, a.district]
      .filter(Boolean)
      .join(', ') || 'No address'
  );
};

// A transport request as its UHS sees it: the mission's type, status and
// address read-only, its destination editable (not once closed). Changes
// saved elsewhere show up in the fields not being edited.
function TransportDestinationMUI({
  transport: r,
  readOnly,
  onSave,
}: {
  transport: TransportRequest;
  readOnly: boolean;
  onSave: (fields: TransportDestination) => Promise<void>;
}) {
  const stored = addressValues(r.mission, 'destination_');
  const destination = useAddressEdits(stored);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const typeName = useMissionTypeName(r.mission.mission_type);
  const closed = r.mission.status === 'closed';
  const locked = readOnly || closed;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || locked) return;
    let fields: TransportDestination;
    try {
      fields = addressChanges(stored, destination.values, 'destination_');
    } catch (err) {
      setError((err as Error).message);
      return;
    }
    if (Object.keys(fields).length === 0) return;
    const sent = destination.values;
    setBusy(true);
    try {
      await onSave(fields);
      destination.saved(sent);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="subtitle1">{typeName || r.mission.occurred_event}</Typography>
          <StatusChip status={r.mission.status} />
        </Stack>
        <MutedMUI>From {addressLine(r)}</MutedMUI>
        <MutedMUI>
          Requested by {r.uhs_name} · {r.created_by} · {new Date(r.created_at).toLocaleString()}
        </MutedMUI>
      </Stack>
      <FormMUI onSubmit={(e) => void submit(e)}>
        <AddressFieldsetMUI
          legend="Destination"
          value={destination.value}
          set={destination.set}
          readOnly={locked || busy}
        />
        <FormActionsMUI
          submitLabel="Save destination"
          canSubmit={destination.dirty}
          busy={busy}
          hidden={locked}
          onDiscard={destination.reset}
          dirty={destination.dirty}
        />
        {closed && <MutedMUI>The mission is closed: its destination cannot change.</MutedMUI>}
        <FormErrorMUI error={error} onClose={() => setError(null)} />
      </FormMUI>
    </Stack>
  );
}

export default TransportDestinationMUI;
