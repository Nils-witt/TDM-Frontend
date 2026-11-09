import { useMemo, useState } from 'react';
import { fetchGroups, groupsPath, memberName, type User } from '@/api/directory';
import { type Report, reportsApi } from '@/api/reports';
import { useResource } from '@/api/resource';
import { useIsAdmin, useSession } from '@/app/session';
import { FormActions, FormError, Section, SectionText } from '@/components/form';
import { ReportDialog } from './ReportDialog';
import styles from './Reports.module.scss';

type Props = {
  report: Report;
  // Names the report's mission.
  event: string;
  users: readonly User[];
  onShared: (r: Report) => void;
  onClose: () => void;
};

const byName = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' });

// Who else may read a report and its PDFs. Only admins may list the
// directory's groups, so others are offered their own groups; any name may be
// typed, for groups only the identity provider knows.
function ShareReportDialog({ report, event, users, onShared, onClose }: Props) {
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

  return (
    <ReportDialog title="Share report" busy={busy} onSubmit={() => void submit()} onClose={onClose}>
      <SectionText>
        Users and members of groups picked here may read the report on <strong>{event}</strong> and
        its PDFs. Only its creator or an admin uploads the signed PDF or changes this.
      </SectionText>
      <Section legend="Users">
        <input
          className="grow"
          type="search"
          aria-label="Find users"
          placeholder="Find users"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div className={styles.shareList} role="group" aria-label="Users">
          {shownUsers.length === 0 && <span className="muted">No users found.</span>}
          {shownUsers.map((u) => (
            <label key={u.id} className="row">
              <input
                type="checkbox"
                checked={userIds.includes(u.id)}
                onChange={(e) => toggle(setUserIds, u.id, e.target.checked)}
              />
              {memberName(u)}
              {u.disabled && <span className="muted"> (disabled)</span>}
            </label>
          ))}
        </div>
      </Section>
      <Section legend="Groups">
        <div className={styles.shareList} role="group" aria-label="Groups">
          {offeredGroups.length === 0 && <span className="muted">No groups found.</span>}
          {offeredGroups.map((name) => (
            <label key={name} className="row">
              <input
                type="checkbox"
                checked={groups.includes(name)}
                onChange={(e) => toggle(setGroups, name, e.target.checked)}
              />
              {name}
            </label>
          ))}
        </div>
        <div className="row">
          <input
            className="grow"
            aria-label="Other group name"
            placeholder="Other group name"
            maxLength={200}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTyped();
              }
            }}
          />
          <button type="button" className="btn" onClick={addTyped} disabled={typed.trim() === ''}>
            Add
          </button>
        </div>
      </Section>
      <FormActions
        submitLabel={busy ? 'Saving…' : 'Save'}
        canSubmit={userIds.length <= 64 && groups.length <= 32}
        busy={busy}
        onDiscard={onClose}
        discardLabel="Cancel"
      />
      <FormError error={error} onClose={() => setError(null)} />
    </ReportDialog>
  );
}

export default ShareReportDialog;
