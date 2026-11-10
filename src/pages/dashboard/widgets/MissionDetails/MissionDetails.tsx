import { useState } from 'react';
import Alert from '@/components/Alert';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  FieldRow,
  FormActions,
  FormError,
  Section,
  SectionText,
  WidgetForm,
  fieldWidth,
} from '@/components/form';
import type { Mission } from '@/api/missions';
import { formatTime } from '../shared/logbookEntries';
import { StatusSelect } from '../shared/MissionStatus';
import { MissionTypeInputs } from '../shared/MissionType';
import { type AddressField, useAddressSuggest } from '../shared/AddressSuggest';
import NearbyPlacesButton from '../shared/NearbyPlacesButton';
import { SuggestInput } from '@/components/SuggestInput';
import { type TextKey, useMissionDetailsWidget, useMissionForm } from './MissionDetails.ts';
import { useRegisterMissionSave } from './missionSave';

// Without a mission it creates one, with the same layout. A closed mission is
// shown read-only.
export function MissionForm({
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
    resetKey,
    id,
  } = useMissionForm(mission, onSaved);
  // The menu bar's Save Mission (⌘S) submits it.
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

  const text = (k: TextKey, label: string, className = 'grow', inputId?: string) => (
    <input
      id={inputId}
      className={className}
      aria-label={inputId ? undefined : label}
      value={value(k)}
      onChange={(e) => set(k, e.target.value)}
    />
  );

  // Suggests values from the API's address directory, if it has one.
  const address = (k: AddressField, label: string, className = 'grow', inputId?: string) => (
    <SuggestInput
      {...suggest[k]}
      id={inputId}
      className={className}
      aria-label={inputId ? undefined : label}
    />
  );

  // The dialog holds a form of its own, so it is not nested in this one.
  return (
    <>
      <WidgetForm ref={setForm} onSubmit={(e) => void save(e)}>
        {closed && (
          <Alert severity="warning">Closed: this mission and its logbook are read-only.</Alert>
        )}
        <Section legend="Created">
          <SectionText>
            {mission ? `${formatTime(mission.created_at)} · ${mission.created_by}` : '-/-'}
          </SectionText>
        </Section>
        <Section legend="Status" disabled={readOnly}>
          <FieldRow id={id('status')} label="Status">
            <StatusSelect
              id={id('status')}
              className="grow"
              value={status}
              stored={storedStatus}
              onChange={(v) => set('status', v)}
            />
          </FieldRow>
          <FieldRow id={id('type')} label="Group / Type">
            <MissionTypeInputs
              key={resetKey}
              id={id('type')}
              value={typeValue}
              onChange={setType}
            />
          </FieldRow>
        </Section>
        <Section legend="Address" disabled={readOnly}>
          <FieldRow id={id('object')} label="Object">
            {address('object_name', 'Object', 'grow', id('object'))}
          </FieldRow>
          <FieldRow id={id('street')} label="Street / No.">
            {address('street', 'Street', 'grow', id('street'))}
            {address('house_number', 'No.', fieldWidth.narrow)}
          </FieldRow>
          <FieldRow id={id('city')} label="City / District">
            {address('city', 'City', 'grow', id('city'))}
            {address('district', 'District')}
          </FieldRow>
          <FieldRow id={id('lat')} label="Lat / Lon">
            {(
              [
                ['lat', 'Latitude', '50.7374'],
                ['lon', 'Longitude', '7.0982'],
              ] as const
            ).map(([k, label, example]) => (
              <input
                key={k}
                id={k === 'lat' ? id(k) : undefined}
                className="grow"
                aria-label={k === 'lat' ? undefined : label}
                inputMode="decimal"
                placeholder={example}
                value={coordValue(k)}
                onChange={(e) => set(k, e.target.value)}
              />
            ))}
            <NearbyPlacesButton
              lat={coordValue('lat')}
              lon={coordValue('lon')}
              set={set}
              disabled={readOnly}
            />
          </FieldRow>
        </Section>
        <Section legend="Callee" disabled={readOnly}>
          <FieldRow id={id('callee')} label="Name / Phone">
            {text('callee', 'Name', 'grow', id('callee'))}
            <input
              type="tel"
              className="grow"
              aria-label="Phone"
              value={value('callee_phone')}
              onChange={(e) => set('callee_phone', e.target.value)}
            />
          </FieldRow>
        </Section>
        <Section legend="Description" disabled={readOnly}>
          <FieldRow id={id('occurred_event')} label="Occurred event" marked>
            <input
              id={id('occurred_event')}
              className="grow"
              required
              value={value('occurred_event')}
              onChange={(e) => set('occurred_event', e.target.value)}
            />
          </FieldRow>
        </Section>
        <FormActions
          submitLabel={creating ? 'Create' : 'Save'}
          canSubmit={canSubmit}
          busy={busy}
          onDiscard={discard}
          dirty={dirty}
          hidden={readOnly}
        />
        <FormError error={error} onClose={() => setError(null)} />
      </WidgetForm>
      {closing && (
        <ConfirmDialog
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

// Unless a mission is selected it creates one, which then becomes the
// selection.
function MissionDetailsWidget() {
  const { mission, error, loading, onSaved, onCreated } = useMissionDetailsWidget();

  if (error) return <Alert severity="error">{error}</Alert>;
  if (loading) return null;
  if (!mission) return <MissionForm mission={null} onSaved={onCreated} />;
  // Keyed by id so unsaved edits do not carry over to another mission.
  return <MissionForm key={mission.id} mission={mission} onSaved={onSaved} />;
}

export default MissionDetailsWidget;
