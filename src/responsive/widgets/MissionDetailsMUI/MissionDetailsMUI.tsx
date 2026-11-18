import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useId, useState } from 'react';
import type { Mission } from '@/api/missions';
import type { AddressKey } from '@/pages/dashboard/widgets/shared/addressEdits';
import { formatTime } from '@/pages/dashboard/widgets/shared/logbookEntries';
import {
  type AddressKind,
  type CoordKey,
  type TextKey,
  addressKey,
  coordKey,
  useMissionForm,
} from '@/pages/dashboard/widgets/MissionDetails/MissionDetails.ts';
import { useRegisterMissionSave } from '@/pages/dashboard/widgets/MissionDetails/missionSave';
import AddressFieldsetMUI from '../shared/AddressFieldsetMUI';
import { FormActionBarMUI } from '../shared/ActionsMUI';
import { ConfirmDialogMUI } from '../shared/DialogsMUI';
import { FieldRowMUI, FormErrorMUI, FormMUI, FormSectionMUI } from '../shared/FormMUI';
import { MissionTypeInputMUI, StatusSelectMUI } from '../shared/MissionInputsMUI';

// The fields of the mission's address or its destination, as on the desktop.
function AddressSectionMUI({
  kind,
  value,
  set,
  coordValue,
  readOnly,
}: {
  kind: AddressKind;
  value: (k: TextKey) => string;
  set: (k: TextKey | CoordKey, v: string) => void;
  coordValue: (k: CoordKey) => string;
  readOnly: boolean;
}) {
  const isCoord = (k: AddressKey): k is 'lat' | 'lon' => k === 'lat' || k === 'lon';
  const fieldValue = (k: AddressKey) =>
    isCoord(k) ? coordValue(coordKey(kind, k)) : value(addressKey(kind, k));
  const setField = (k: AddressKey, v: string) =>
    set(isCoord(k) ? coordKey(kind, k) : addressKey(kind, k), v);
  return (
    <AddressFieldsetMUI
      legend={kind === 'address' ? 'Address' : 'Destination'}
      value={fieldValue}
      set={setField}
      readOnly={readOnly}
    />
  );
}

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
    closed,
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
    moving,
    confirmMove,
    cancelMove,
    scopeLocked,
    resetKey,
    scopeValue,
    setScope,
    scopeChoices,
  } = useMissionForm(mission, onSaved);
  // ⌘S submits it, as on the desktop.
  const [form, setForm] = useState<HTMLFormElement | null>(null);
  const formId = useId();
  useRegisterMissionSave(form, !readOnly && canSubmit && !busy);
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

  return (
    <>
      <FormMUI ref={setForm} onSubmit={(e) => void save(e)}>
        {closed && (
          <Alert severity="warning">Closed: this mission and its logbook are read-only.</Alert>
        )}
        <FormSectionMUI legend="Created">
          <Typography variant="body2">
            {mission ? `${formatTime(mission.created_at)} · ${mission.created_by}` : '-/-'}
          </Typography>
        </FormSectionMUI>
        <FormSectionMUI legend="Scope" disabled={readOnly || scopeLocked}>
          {/* Scope IDs are UUIDs, so '' stands for Default. */}
          <TextField
            select
            label="Scope"
            size="small"
            value={scopeValue ?? ''}
            disabled={readOnly || scopeLocked}
            onChange={(e) => setScope(e.target.value || null)}
          >
            {scopeChoices.map((s) => (
              <MenuItem key={s.id ?? ''} value={s.id ?? ''}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>
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
            <MissionTypeInputMUI
              key={resetKey}
              value={typeValue}
              onChange={setType}
              disabled={readOnly}
            />
          </FieldRowMUI>
        </FormSectionMUI>
        {(['address', 'destination'] as const).map((kind) => (
          <AddressSectionMUI
            key={kind}
            kind={kind}
            value={value}
            set={set}
            coordValue={coordValue}
            readOnly={readOnly}
          />
        ))}
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
        <FormActionBarMUI
          label="Mission"
          form={formId}
          submitLabel={creating ? 'Create' : 'Save'}
          canSubmit={canSubmit}
          busy={busy}
          onDiscard={discard}
          dirty={dirty}
          hidden={readOnly}
        />
        <FormErrorMUI error={error} onClose={() => setError(null)} />
      </FormMUI>
      {moving && (
        <ConfirmDialogMUI
          title="Move mission"
          message="The mission moves to another scope. You work in this scope only, so it disappears from your view."
          confirmLabel="Move mission"
          onConfirm={confirmMove}
          onCancel={cancelMove}
        />
      )}
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
