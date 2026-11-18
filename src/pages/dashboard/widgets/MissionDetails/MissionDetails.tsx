import { useId, useState } from 'react';
import Alert from '@/components/Alert';
import ConfirmDialog from '@/components/ConfirmDialog';
import { FieldRow, FormError, Section, SectionText, WidgetForm } from '@/components/form';
import type { Mission } from '@/api/missions';
import { formatTime } from '../shared/logbookEntries';
import { StatusSelect } from '../shared/MissionStatus';
import { MissionTypeInput } from '../shared/MissionType';
import AddressFieldset from '../shared/AddressFieldset';
import type { AddressKey } from '../shared/addressEdits';
import { FormActionBar } from '../shared/WidgetActionBar';
import {
  type AddressKind,
  type CoordKey,
  type TextKey,
  addressKey,
  coordKey,
  useMissionDetailsWidget,
  useMissionForm,
} from './MissionDetails.ts';
import { useRegisterMissionSave } from './missionSave';

// The fields of the mission's address or its destination. The values suggest
// from the API's address directory, if it has one.
function AddressSection({
  kind,
  value,
  set,
  coordValue,
  readOnly,
  id: formId,
}: {
  kind: AddressKind;
  value: (k: TextKey) => string;
  set: (k: TextKey | CoordKey, v: string) => void;
  coordValue: (k: CoordKey) => string;
  readOnly: boolean;
  id: (k: string) => string;
}) {
  const isCoord = (k: AddressKey): k is 'lat' | 'lon' => k === 'lat' || k === 'lon';
  const fieldValue = (k: AddressKey) =>
    isCoord(k) ? coordValue(coordKey(kind, k)) : value(addressKey(kind, k));
  const setField = (k: AddressKey, v: string) =>
    set(isCoord(k) ? coordKey(kind, k) : addressKey(kind, k), v);
  return (
    <AddressFieldset
      legend={kind === 'address' ? 'Address' : 'Destination'}
      value={fieldValue}
      set={setField}
      readOnly={readOnly}
      id={(k) => formId(`${kind}-${k}`)}
    />
  );
}

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
    moving,
    confirmMove,
    cancelMove,
    scopeLocked,
    resetKey,
    scopeValue,
    setScope,
    scopeChoices,
    id,
  } = useMissionForm(mission, onSaved);
  // The menu bar's Save Mission (⌘S) submits it.
  const [form, setForm] = useState<HTMLFormElement | null>(null);
  const formId = useId();
  useRegisterMissionSave(form, !readOnly && canSubmit && !busy);
  const text = (k: TextKey, label: string, className = 'grow', inputId?: string) => (
    <input
      id={inputId}
      className={className}
      aria-label={inputId ? undefined : label}
      value={value(k)}
      onChange={(e) => set(k, e.target.value)}
    />
  );

  // The dialog holds a form of its own, so it is not nested in this one.
  return (
    <>
      <WidgetForm id={formId} ref={setForm} onSubmit={(e) => void save(e)}>
        {closed && (
          <Alert severity="warning">Closed: this mission and its logbook are read-only.</Alert>
        )}
        <Section legend="Created">
          <SectionText>
            {mission ? `${formatTime(mission.created_at)} · ${mission.created_by}` : '-/-'}
          </SectionText>
        </Section>
        <Section legend="Scope" disabled={readOnly || scopeLocked}>
          <FieldRow id={id('scope')} label="Scope">
            {/* Scope IDs are UUIDs, so '' stands for Default. */}
            <select
              id={id('scope')}
              className="grow"
              title={
                scopeLocked
                  ? mission
                    ? 'Moving a mission to another scope needs the permission missions.manage'
                    : "New missions are created in your session's scope"
                  : undefined
              }
              value={scopeValue ?? ''}
              onChange={(e) => setScope(e.target.value || null)}
            >
              {scopeChoices.map((s) => (
                <option key={s.id ?? ''} value={s.id ?? ''}>
                  {s.name}
                </option>
              ))}
            </select>
          </FieldRow>
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
          <FieldRow id={id('type')} label="Type">
            <MissionTypeInput key={resetKey} id={id('type')} value={typeValue} onChange={setType} />
          </FieldRow>
        </Section>
        {(['address', 'destination'] as const).map((kind) => (
          <AddressSection
            key={kind}
            kind={kind}
            value={value}
            set={set}
            coordValue={coordValue}
            readOnly={readOnly}
            id={id}
          />
        ))}
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
        <FormActionBar
          label="Mission"
          form={formId}
          submitLabel={creating ? 'Create' : 'Save'}
          canSubmit={canSubmit}
          busy={busy}
          onDiscard={discard}
          dirty={dirty}
          hidden={readOnly}
        />
        <FormError error={error} onClose={() => setError(null)} />
      </WidgetForm>
      {moving && (
        <ConfirmDialog
          title="Move mission"
          message="The mission moves to another scope. You work in this scope only, so it disappears from your view."
          confirmLabel="Move mission"
          onConfirm={confirmMove}
          onCancel={cancelMove}
        />
      )}
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
