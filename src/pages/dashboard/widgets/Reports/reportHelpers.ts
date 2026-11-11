import type { Principal } from '@/api/auth';
import { memberName, type User } from '@/api/directory';
import type { Mission } from '@/api/missions';
import type { Report } from '@/api/reports';
import { isAdmin } from '@/app/session';

// Reports are made of done or closed missions only.
export const isFinished = (m: Mission) => m.status === 'done' || m.status === 'closed';

// Unsigned reports, by their creator or an admin. created_by is the normalised
// (lowercase) username.
export const canSign = (r: Report, p: Principal) =>
  r.signed === null && (isAdmin(p) || p.username?.toLowerCase() === r.created_by);

// By its creator or an admin, signed or not.
export const canShare = (r: Report, p: Principal) =>
  isAdmin(p) || p.username?.toLowerCase() === r.created_by;

// In the browser's time zone, to the minute.
export const localInputValue = (t: Date) => {
  const local = new Date(t.getTime() - t.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

export type Users = {
  byId: ReadonlyMap<string, User>;
  byUsername: ReadonlyMap<string, User>;
};

// A deleted mission is no longer listed: shown by its ID.
export const missionName = (missions: ReadonlyMap<string, Mission>, id: string) =>
  missions.get(id)?.occurred_event ?? id;

// Reports record users by username (created_by) and signers by user ID.
export const userByName = (users: Users, username: string) => {
  const u = users.byUsername.get(username);
  return u ? memberName(u) : username;
};
export const userById = (users: Users, id: string) => {
  const u = users.byId.get(id);
  return u ? memberName(u) : id;
};

// The names a report is shared with, groups marked.
export const shareNames = (report: Report, users: Users) => [
  ...report.shared_users.map((id) => userById(users, id)),
  ...report.shared_groups.map((g) => `${g} (group)`),
];
