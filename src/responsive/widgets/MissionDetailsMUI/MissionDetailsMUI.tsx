import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import type { Mission } from '@/api/missions';
import {
  type AddressField,
  useAddressSuggest,
} from '@/pages/dashboard/widgets/shared/AddressSuggest';
import { formatTime } from '@/pages/dashboard/widgets/shared/logbookEntries';
import {
  type TextKey,
  useMissionForm,
} from '@/pages/dashboard/widgets/MissionDetails/MissionDetails.ts';
import { useRegisterMissionSave } from '@/pages/dashboard/widgets/MissionDetails/missionSave';
import AddressFieldMUI from '../shared/AddressFieldMUI';
import { ConfirmDialogMUI } from '../shared/DialogsMUI';
import {
  FieldRowMUI,
  FormActionsMUI,
  FormErrorMUI,
  FormMUI,
  FormSectionMUI,
} from '../shared/FormMUI';
import { MissionTypeInputsMUI, StatusSelectMUI } from '../shared/MissionInputsMUI';

// The Mission Details form in MUI, with useMissionForm's rules: without a
// mission it creates one, a closed mission is read-only, and saving a close
// asks first. There is no widget wrapper, as the desktop one reads the
// dashboard's selection; pages pass the mission.
export function MissionFormMUI({
  mission,
  onSaved,
}: {
  mission: Mission | null;
  onSaved: (m: Mission) => Promise<void>;
}) {
  const {
    creating,
    readOnly,
    value,
    status,
    storedStatus,
    coordValue,
    set,
    typeValue,
    setType,
    dirty,
    canSubmit,
    busy,
    error,
    setError,
    save,
    discard,
    closing,
    confirmClose,
    cancelClose,
    resetKey,
  } = useMissionForm(mission, onSaved);
  // ⌘S submits it, as on the desktop.
  const [form, setForm] = useState<HTMLFormElement | null>(null);
  useRegisterMissionSave(form, !readOnly && canSubmit && !busy);
  const suggest = useAddressSuggest(
    (k) => value(`address_${k}`),
    (k, v) => set(`address_${k}`, v),
    (lat, lon) => {
      set('lat', lat);
      set('lon', lon);
    },
  );

  const text = (k: TextKey, label: string, type?: string) => (
    <TextField
      label={label}
      size="small"
      type={type}
      value={value(k)}
      disabled={readOnly}
      onChange={(e) => set(k, e.target.value)}
    />
  );

  const address = (k: AddressField, label: string) => (
    <AddressFieldMUI {...suggest[k]} label={label} disabled={readOnly} />
  );

  return (
    <>
      <FormMUI ref={setForm} onSubmit={(e) => void save(e)}>
        {readOnly && (
          <Alert severity="warning">Closed: this mission and its logbook are read-only.</Alert>
        )}
        <FormSectionMUI legend="Created">
          <Typography variant="body2">
            {mission ? `${formatTime(mission.created_at)} · ${mission.created_by}` : '-/-'}
          </Typography>
        </FormSectionMUI>
        <FormSectionMUI legend="Status" disabled={readOnly}>
          <FieldRowMUI>
            <StatusSelectMUI
              value={status}
              stored={storedStatus}
              onChange={(v) => set('status', v)}
              disabled={readOnly}
            />
          </FieldRowMUI>
          <FieldRowMUI>
            <MissionTypeInputsMUI
              key={resetKey}
              value={typeValue}
              onChange={setType}
              disabled={readOnly}
            />
          </FieldRowMUI>
        </FormSectionMUI>
        <FormSectionMUI legend="Address" disabled={readOnly}>
          {text('address_object_name', 'Object')}
          <FieldRowMUI>
            {address('street', 'Street')}
            {address('house_number', 'No.')}
          </FieldRowMUI>
          <FieldRowMUI>
            {address('city', 'City')}
            {address('district', 'District')}
          </FieldRowMUI>
          <FieldRowMUI>
            {(
              [
                ['lat', 'Latitude', '50.7374'],
                ['lon', 'Longitude', '7.0982'],
              ] as const
            ).map(([k, label, example]) => (
              <TextField
                key={k}
                label={label}
                size="small"
                placeholder={example}
                value={coordValue(k)}
                disabled={readOnly}
                onChange={(e) => set(k, e.target.value)}
                slotProps={{ htmlInput: { inputMode: 'decimal' } }}
              />
            ))}
          </FieldRowMUI>
        </FormSectionMUI>
        <FormSectionMUI legend="Callee" disabled={readOnly}>
          <FieldRowMUI>
            {text('callee', 'Name')}
            {text('callee_phone', 'Phone', 'tel')}
          </FieldRowMUI>
        </FormSectionMUI>
        <FormSectionMUI legend="Description" disabled={readOnly}>
          <TextField
            label="Occurred event"
            size="small"
            required
            value={value('occurred_event')}
            disabled={readOnly}
            onChange={(e) => set('occurred_event', e.target.value)}
          />
        </FormSectionMUI>
        <FormActionsMUI
          submitLabel={creating ? 'Create' : 'Save'}
          canSubmit={canSubmit}
          busy={busy}
          onDiscard={discard}
          dirty={dirty}
          hidden={readOnly}
        />
        <FormErrorMUI error={error} onClose={() => setError(null)} />
      </FormMUI>
      {closing && (
        <ConfirmDialogMUI
          title="Close mission"
          message="A closed mission, its logbook and its tasks can no longer be changed. This cannot be undone."
          confirmLabel="Close mission"
          onConfirm={confirmClose}
          onCancel={cancelClose}
        />
      )}
    </>
  );
}
