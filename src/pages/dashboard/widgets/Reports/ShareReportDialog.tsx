import { memberName, type User } from '@/api/directory';
import type { Report } from '@/api/reports';
import { FormActions, FormError, Section, SectionText } from '@/components/form';
import { ReportDialog } from './ReportDialog';
import { useShareReport } from './useShareReport';
import styles from './Reports.module.scss';

type Props = {
  report: Report;
  // Names the report's mission.
  event: string;
  users: readonly User[];
  onShared: (r: Report) => void;
  onClose: () => void;
};

// Who else may read a report and its PDFs (see useShareReport).
function ShareReportDialog({ report, event, users, onShared, onClose }: Props) {
  const {
    userIds,
    groups,
    toggleUser,
    toggleGroup,
    filter,
    setFilter,
    shownUsers,
    offeredGroups,
    typed,
    setTyped,
    addTyped,
    canSubmit,
    busy,
    error,
    setError,
    submit,
  } = useShareReport({ report, users, onShared });

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
                onChange={(e) => toggleUser(u.id, e.target.checked)}
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
                onChange={(e) => toggleGroup(name, e.target.checked)}
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
        canSubmit={canSubmit}
        busy={busy}
        onDiscard={onClose}
        discardLabel="Cancel"
      />
      <FormError error={error} onClose={() => setError(null)} />
    </ReportDialog>
  );
}

export default ShareReportDialog;
