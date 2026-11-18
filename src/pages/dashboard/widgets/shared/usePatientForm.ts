import { type FormEvent, useState } from 'react';
import {
  blankToNull,
  criticalCategoryOf,
  localDate,
  type Patient,
  type PatientCriticalCategory,
  type PatientFields,
} from '@/api/patients';
import { useNow } from '@/app/useNow';

export type PatientDraft = {
  first_name: string;
  last_name: string;
  birth_date: string;
  event: string;
  critical_category: PatientCriticalCategory;
  // '' without one.
  medical_category: string;
};

export const patientDraftOf = (p: Patient | null): PatientDraft => ({
  first_name: p?.first_name ?? '',
  last_name: p?.last_name ?? '',
  birth_date: p?.birth_date ?? '',
  event: p?.event ?? '',
  critical_category: p ? criticalCategoryOf(p) : 'not_set',
  medical_category: p?.medical_category ?? '',
});

export const patientFieldsOf = (d: PatientDraft): PatientFields => ({
  first_name: blankToNull(d.first_name),
  last_name: blankToNull(d.last_name),
  birth_date: d.birth_date === '' ? null : d.birth_date,
  event: blankToNull(d.event),
  critical_category: d.critical_category,
  medical_category: d.medical_category === '' ? null : d.medical_category,
});

// The state of a patient's form, shared by the desktop PatientForm and the
// responsive PatientFormMUI: the draft, today (the birth date's max), and a
// submit that reports the API's error. patient is null for a new one, whose
// draft clears after a submit. The caller keys it by the patient's version.
export function usePatientForm(
  patient: Patient | null,
  onSubmit: (fields: PatientFields) => Promise<void>,
  disabled = false,
) {
  const [draft, setDraft] = useState(() => patientDraftOf(patient));
  const today = localDate(new Date(useNow(60_000)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initial = patientDraftOf(patient);
  const dirty = (Object.keys(draft) as (keyof PatientDraft)[]).some((k) => draft[k] !== initial[k]);
  const set = (k: keyof PatientDraft) => (value: string) => setDraft((d) => ({ ...d, [k]: value }));

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (busy || disabled) return;
    setBusy(true);
    try {
      await onSubmit(patientFieldsOf(draft));
      setError(null);
      if (!patient) setDraft(patientDraftOf(null));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setDraft(patientDraftOf(patient));
    setError(null);
  };

  return { draft, set, today, busy, error, setError, dirty, submit, reset };
}
