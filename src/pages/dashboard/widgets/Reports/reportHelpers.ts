import type { Principal } from '@/api/auth';
import type { Mission } from '@/api/missions';
import type { Report } from '@/api/reports';
import { isAdmin } from '@/app/session';

// Reports are made of done or closed missions only.
export const isFinished = (m: Mission) => m.status === 'done' || m.status === 'closed';

// Unsigned reports, by their creator or an admin. created_by is the normalised
// (lowercase) username.
export const canSign = (r: Report, p: Principal) =>
  r.signed === null && (isAdmin(p) || p.username?.toLowerCase() === r.created_by);

// In the browser's time zone, to the minute.
export const localInputValue = (t: Date) => {
  const local = new Date(t.getTime() - t.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};
