import { useMemo, useState } from 'react';
import { fetchGroups, groupsPath, memberName, type User } from '@/api/directory';
import { type Report, reportsApi } from '@/api/reports';
import { useResource } from '@/api/resource';
import { useIsAdmin, useSession } from '@/app/session';

const byName = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' });

// The Share report dialog's state, shared by the dashboard and the responsive
// UI. Only admins may list the directory's groups, so others are offered their
// own groups; any name may be typed, for groups only the identity provider
// knows.
export function useShareReport({
  report,
  users,
  onShared,
}: {
  report: Report;
  users: readonly User[];
  onShared: (r: Report) => void;
}) {
  const { principal } = useSession();
  const admin = useIsAdmin();
  const directory = useResource(admin ? groupsPath : null, fetchGroups);
  const [userIds, setUserIds] = useState<string[]>(report.shared_users);
  const [groups, setGroups] = useState<string[]>(report.shared_groups);
  const [filter, setFilter] = useState('');
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The API accepts enabled users only, but keeps those shared with already.
  const offeredUsers = useMemo(
    () =>
      users
        .filter(
          (u) =>
            (!u.disabled || report.shared_users.includes(u.id)) && u.username !== report.created_by,
        )
        .toSorted((a, b) => byName(memberName(a), memberName(b))),
    [users, report.shared_users, report.created_by],
  );
  const needle = filter.trim().toLowerCase();
  const shownUsers =
    needle === ''
      ? offeredUsers
      : offeredUsers.filter(
          (u) =>
            userIds.includes(u.id) ||
            memberName(u).toLowerCase().includes(needle) ||
            u.username?.toLowerCase().includes(needle),
        );

  const groupNames = useMemo(
    () =>
      [
        ...new Set([
          ...(directory.data ?? []).map((g) => g.name),
          ...principal.groups,
          ...report.shared_groups,
        ]),
      ].sort(byName),
    [directory.data, principal.groups, report.shared_groups],
  );
  const offeredGroups = [...groupNames, ...groups.filter((g) => !groupNames.includes(g))];

  const toggle = (set: typeof setUserIds, value: string, on: boolean) =>
    set((xs) => (on ? [...xs, value] : xs.filter((x) => x !== value)));

  const addTyped = () => {
    const name = typed.trim();
    if (name !== '' && !groups.includes(name)) setGroups((gs) => [...gs, name]);
    setTyped('');
  };

  const submit = async () => {
    setBusy(true);
    try {
      onShared(await reportsApi.share(report.id, userIds, groups));
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return {
    userIds,
    groups,
    toggleUser: (id: string, on: boolean) => toggle(setUserIds, id, on),
    toggleGroup: (name: string, on: boolean) => toggle(setGroups, name, on),
    filter,
    setFilter,
    shownUsers,
    offeredGroups,
    typed,
    setTyped,
    addTyped,
    canSubmit: userIds.length <= 64 && groups.length <= 32,
    busy,
    error,
    setError,
    submit,
  };
}
