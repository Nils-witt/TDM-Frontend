import { useId } from 'react';
import { memberName, type User } from '@/api/directory';
import type { Report } from '@/api/reports';
import { FieldRow, FormActions, FormError, Section, SectionText } from '@/components/form';
import { DeleteIcon } from '@/components/icons';
import { ReportDialog } from './ReportDialog';
import { type SignerRow, useSignReport } from './useSignReport';
import styles from './Reports.module.scss';

type Props = {
  report: Report;
  // Names the report's mission.
  event: string;
  users: readonly User[];
  onSigned: (r: Report) => void;
  onClose: () => void;
};

// A report is signed once: this cannot be changed afterwards.
function SignReportDialog({ report, event, users, onSigned, onClose }: Props) {
  const id = useId();
  const {
    live,
    setFile,
    note,
    setNote,
    rows,
    update,
    add,
    remove,
    canAdd,
    min,
    max,
    canSubmit,
    busy,
    error,
    setError,
    submit,
  } = useSignReport({ report, users, onSigned });

  return (
    <ReportDialog
      title="Upload signed report"
      busy={busy}
      onSubmit={() => void submit()}
      onClose={onClose}
    >
      <SectionText>
        Upload the signed PDF of the report on <strong>{event}</strong> and who signed it. A report
        is signed once: this cannot be changed afterwards.
      </SectionText>
      <FieldRow id={`${id}-file`} label="Signed PDF" marked>
        <input
          id={`${id}-file`}
          type="file"
          accept="application/pdf,.pdf"
          className="grow"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          autoFocus
        />
      </FieldRow>
      <Section legend="Signatures">
        {rows.map((r, i) => (
          <div key={r.key} className={styles.signer}>
            <select
              aria-label={`Signer ${i + 1} kind`}
              value={r.kind}
              onChange={(e) => update(r.key, { kind: e.target.value as SignerRow['kind'] })}
            >
              <option value="user">User</option>
              <option value="external">External</option>
            </select>
            {r.kind === 'user' ? (
              <select
                aria-label={`Signer ${i + 1}`}
                className="grow"
                value={r.userId}
                onChange={(e) => update(r.key, { userId: e.target.value })}
              >
                <option value="">Pick a user…</option>
                {live.map((u) => (
                  <option key={u.id} value={u.id}>
                    {memberName(u)}
                  </option>
                ))}
              </select>
            ) : (
              <input
                aria-label={`Signer ${i + 1} name`}
                className="grow"
                placeholder="Name"
                maxLength={255}
                value={r.name}
                onChange={(e) => update(r.key, { name: e.target.value })}
              />
            )}
            <input
              type="datetime-local"
              aria-label={`Signer ${i + 1} signed at`}
              min={min}
              max={max}
              value={r.at}
              onChange={(e) => update(r.key, { at: e.target.value })}
            />
            <button
              type="button"
              className="icon-btn"
              aria-label={`Remove signer ${i + 1}`}
              disabled={rows.length === 1}
              onClick={() => remove(r.key)}
            >
              <DeleteIcon />
            </button>
          </div>
        ))}
        <div className="row">
          <button type="button" className="btn" onClick={add} disabled={!canAdd}>
            Add signer
          </button>
        </div>
      </Section>
      <FieldRow id={`${id}-note`} label="Note">
        <textarea
          id={`${id}-note`}
          className="grow"
          rows={2}
          maxLength={4000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </FieldRow>
      <FormActions
        submitLabel={busy ? 'Uploading…' : 'Upload'}
        canSubmit={canSubmit}
        busy={busy}
        onDiscard={onClose}
        discardLabel="Cancel"
      />
      <FormError error={error} onClose={() => setError(null)} />
    </ReportDialog>
  );
}

export default SignReportDialog;
