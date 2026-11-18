import type { Timestamp } from './entity';
import type { PatientCriticalCategory } from './patients';
import { useResource } from './resource';

// Counts of the patients of the session scope's UHS (an UHS session: its
// own only), now and in the last hours: GET /api/v1/uhs-statistics, which
// needs patients.view. Only counts, but online only like the patients they
// come from (persist: false); reloaded by patient, stay, transport, mission
// and UHS events (typePaths in events.ts).

export type UhsStatisticsEntry = {
  uhs: string;
  name: string;
  active: boolean;
  // The patients in it now.
  current: {
    total: number;
    arrived: number;
    // Assigned, not yet arrived.
    inbound: number;
    critical: Record<PatientCriticalCategory, number>;
    // Per medical category ID (null for none), most first.
    medical: { category: string | null; count: number }[];
  };
  // Its stays in the window.
  window: {
    // Stays that began.
    admitted: number;
    // Stays that ended: by a checkout, a move to another UHS, or otherwise
    // (released with a reason, the patient deleted).
    checked_out: number;
    moved_out: number;
    removed: number;
    // Transport requests made.
    transports: number;
    // Mean arrival to checkout of the checkouts; null without one.
    avg_stay_minutes: number | null;
    // Every hour from the one since falls in.
    arrivals_per_hour: { hour: Timestamp; count: number }[];
  };
};

export type UhsStatistics = {
  since: Timestamp;
  until: Timestamp;
  // By name, inactive ones included.
  uhs: UhsStatisticsEntry[];
};

export const uhsStatisticsBasePath = '/api/v1/uhs-statistics';
// The API's limit: a week.
export const uhsStatisticsMaxHours = 168;

export const uhsStatisticsPath = (hours: number) =>
  `${uhsStatisticsBasePath}?hours=${encodeURIComponent(String(hours))}`;

const keepOut = { persist: false };

// null loads nothing, e.g. offline.
export const useUhsStatistics = (hours: number | null) =>
  useResource<UhsStatistics>(hours === null ? null : uhsStatisticsPath(hours), undefined, keepOut);
