import {
  formatPatientName,
  isInbound,
  type Patient,
  uhsArrival,
  usePatients,
} from '@/api/patients';

const noPatients: readonly Patient[] = [];

// Sorts the patients of an UHS by when they arrived (earliest first, as a
// queue) or newest first; an inbound patient by when it was assigned.
export function sortByArrival(
  patients: readonly Patient[],
  order: 'arrival' | 'newest',
): Patient[] {
  const since = (p: Patient) => uhsArrival(p) ?? p.uhs?.since ?? '';
  return patients.toSorted((a, b) => {
    const c = since(a).localeCompare(since(b));
    return order === 'arrival' ? c : -c;
  });
}

// Whether the patient matches a name search (any word of q in the name or
// event), for the responsive list's search field.
export function matchesPatient(p: Patient, q: string): boolean {
  const words = q
    .toLowerCase()
    .split(/[\s,]+/)
    .filter(Boolean);
  const text = `${formatPatientName(p)} ${p.event ?? ''}`.toLowerCase();
  return words.every((w) => text.includes(w));
}

// The patients currently in the UHS uhsId (null loads nothing), sorted:
// all of them, those that arrived and those still inbound (assigned from a
// mission, on their way). Shared by the desktop widget and the responsive
// UHS view.
export function useUhsPatients(uhsId: string | null, order: 'arrival' | 'newest') {
  const list = usePatients(uhsId ? { uhs: uhsId } : null);
  const patients = sortByArrival(list.data ?? noPatients, order);
  const inbound = patients.filter(isInbound);
  const arrived = patients.filter((p) => !isInbound(p));
  return { patients, arrived, inbound, list };
}
