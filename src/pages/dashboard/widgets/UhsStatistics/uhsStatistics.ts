import { type MedicalCategory, medicalCategoryPath } from '@/api/medicalCategories';
import type { PatientCriticalCategory } from '@/api/patients';
import type { UhsStatisticsEntry } from '@/api/uhsStatistics';

// The windows the widget offers, in hours (the API allows 1–168).
export const statisticsWindows: readonly { value: number; label: string }[] = [
  { value: 6, label: 'Last 6 h' },
  { value: 12, label: 'Last 12 h' },
  { value: 24, label: 'Last 24 h' },
  { value: 48, label: 'Last 48 h' },
  { value: 168, label: 'Last 7 days' },
];

// The option's value, or 24 for one not offered.
export function windowHours(option: unknown): number {
  const n = Number(option);
  return statisticsWindows.some((w) => w.value === n) ? n : 24;
}

// The triage categories in the order the bars stack them: most urgent first.
export const triageOrder: readonly PatientCriticalCategory[] = [
  'red',
  'yellow',
  'green',
  'not_set',
];

// The sums over every UHS for the totals row. The mean stay is weighted by
// the checkouts it is the mean of.
export function totalsOf(entries: readonly UhsStatisticsEntry[]): UhsStatisticsEntry {
  const critical: Record<PatientCriticalCategory, number> = {
    red: 0,
    yellow: 0,
    green: 0,
    not_set: 0,
  };
  const medical = new Map<string | null, number>();
  const hours = new Map<string, number>();
  let total = 0;
  let arrived = 0;
  let inbound = 0;
  let admitted = 0;
  let checkedOut = 0;
  let movedOut = 0;
  let transports = 0;
  let stayMinutes = 0;
  let timedCheckouts = 0;
  for (const e of entries) {
    total += e.current.total;
    arrived += e.current.arrived;
    inbound += e.current.inbound;
    for (const c of triageOrder) critical[c] += e.current.critical[c] ?? 0;
    for (const m of e.current.medical)
      medical.set(m.category, (medical.get(m.category) ?? 0) + m.count);
    admitted += e.window.admitted;
    checkedOut += e.window.checked_out;
    movedOut += e.window.moved_out;
    transports += e.window.transports;
    if (e.window.avg_stay_minutes !== null) {
      stayMinutes += e.window.avg_stay_minutes * e.window.checked_out;
      timedCheckouts += e.window.checked_out;
    }
    for (const h of e.window.arrivals_per_hour)
      hours.set(h.hour, (hours.get(h.hour) ?? 0) + h.count);
  }
  return {
    uhs: '',
    name: 'All UHS',
    active: true,
    current: {
      total,
      arrived,
      inbound,
      critical,
      medical: [...medical]
        .map(([category, count]) => ({ category, count }))
        .toSorted((a, b) => b.count - a.count),
    },
    window: {
      admitted,
      checked_out: checkedOut,
      moved_out: movedOut,
      transports,
      avg_stay_minutes: timedCheckouts > 0 ? stayMinutes / timedCheckouts : null,
      arrivals_per_hour: [...hours]
        .map(([hour, count]) => ({ hour, count }))
        .toSorted((a, b) => a.hour.localeCompare(b.hour)),
    },
  };
}

export type MedicalRow = { key: string; label: string; count: number };

// The current patients per medical category, named by their path, most
// first: "None" without one, "Unknown category" for one deleted since.
export function medicalRows(
  medical: UhsStatisticsEntry['current']['medical'],
  categories: readonly MedicalCategory[],
): MedicalRow[] {
  return medical
    .map((m) => ({
      key: m.category ?? '',
      label:
        m.category === null
          ? 'None'
          : (medicalCategoryPath(categories, m.category) ?? 'Unknown category'),
      count: m.count,
    }))
    .toSorted((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

// "45 min", "2 h 5 min"; "–" without a value.
export function formatMinutes(minutes: number | null): string {
  if (minutes === null) return '–';
  const m = Math.round(minutes);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h} h` : `${h} h ${rest} min`;
}
