import { type FormEvent, type ReactNode, useId, useState } from 'react';
import {
  blankToNull,
  localDate,
  type Patient,
  type PatientFields,
  patientTextMax,
} from '@/api/patients';
import { useNow } from '@/app/useNow';
import { FieldRow, FormActions, FormError, Section, WidgetForm } from '@/components/form';

type Draft = { first_name: string; last_name: string; birth_date: string; event: string };

const draftOf = (p: Patient | null): Draft => ({
  first_name: p?.first_name ?? '',
  last_name: p?.last_name ?? '',
  birth_date: p?.birth_date ?? '',
  event: p?.event ?? '',
});

const fieldsOf = (d: Draft): PatientFields => ({
  first_name: blankToNull(d.first_name),
  last_name: blankToNull(d.last_name),
  birth_date: d.birth_date === '' ? null : d.birth_date,
  event: blankToNull(d.event),
});

type Props = {
  // null for a new patient. Keyed by the caller, so another patient starts
  // a fresh draft.
  patient: Patient | null;
  legend: string;
  submitLabel: string;
  disabled?: boolean;
  // Rejects with the message to show.
  onSubmit: (fields: PatientFields) => Promise<void>;
  onDiscard?: () => void;
  extra?: ReactNode;
};

// Every field is optional, so an unknown patient can be recorded; the API
// trims the text and refuses birth dates in the future.
function PatientForm({
  patient,
  legend,
  submitLabel,
  disabled,
  onSubmit,
  onDiscard,
  extra,
}: Props) {
  const id = useId();
  const [draft, setDraft] = useState(() => draftOf(patient));
  const today = localDate(new Date(useNow(60_000)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initial = draftOf(patient);
  const dirty = (Object.keys(draft) as (keyof Draft)[]).some((k) => draft[k] !== initial[k]);
  const set = (k: keyof Draft) => (value: string) => setDraft((d) => ({ ...d, [k]: value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || disabled) return;
    setBusy(true);
    try {
      await onSubmit(fieldsOf(draft));
      setError(null);
      if (!patient) setDraft(draftOf(null));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const text = (key: 'first_name' | 'last_name' | 'event', label: string) => (
    <FieldRow id={`${id}-${key}`} label={label}>
      <input
        id={`${id}-${key}`}
        className="grow"
        value={draft[key]}
        maxLength={patientTextMax}
        autoComplete="off"
        onChange={(e) => set(key)(e.target.value)}
      />
    </FieldRow>
  );

  return (
    <WidgetForm onSubmit={(e) => void submit(e)}>
      <Section legend={legend} disabled={disabled}>
        {text('last_name', 'Last name')}
        {text('first_name', 'First name')}
        <FieldRow id={`${id}-birth`} label="Birth date">
          <input
            id={`${id}-birth`}
            type="date"
            value={draft.birth_date}
            max={today}
            onChange={(e) => set('birth_date')(e.target.value)}
          />
        </FieldRow>
        {text('event', 'Event')}
      </Section>
      <FormActions
        submitLabel={submitLabel}
        busy={busy}
        hidden={disabled}
        canSubmit={!patient || dirty}
        dirty={onDiscard ? true : dirty}
        onDiscard={
          onDiscard ??
          (() => {
            setDraft(draftOf(patient));
            setError(null);
          })
        }
        discardLabel={onDiscard ? 'Cancel' : 'Discard'}
        extra={extra}
      />
      <FormError error={error} onClose={() => setError(null)} />
    </WidgetForm>
  );
}

export default PatientForm;
