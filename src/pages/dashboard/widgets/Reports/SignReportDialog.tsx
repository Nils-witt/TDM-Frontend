import { useId, useMemo, useState } from 'react';
import { memberName, type User } from '@/api/directory';
import { type Report, type SignatureInput, reportsApi } from '@/api/reports';
import { FieldRow, FormActions, FormError, Section, SectionText } from '@/components/form';
import { DeleteIcon } from '@/components/icons';
import { ReportDialog } from './ReportDialog';
import { localInputValue } from './reportHelpers';
import styles from './Reports.module.scss';

// A user, or an external signer by name; the time is local.
type SignerRow = {
  key: number;
  kind: 'user' | 'external';
  userId: string;
  name: string;
  at: string;
};

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
  // The API accepts enabled users only.
  const live = useMemo(
    () =>
      users
        .filter((u) => !u.disabled)
        .toSorted((a, b) => memberName(a).localeCompare(memberName(b))),
    [users],
  );
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [nextKey, setNextKey] = useState(1);
  const [rows, setRows] = useState<SignerRow[]>(() => [
    { key: 0, kind: 'user', userId: '', name: '', at: localInputValue(new Date()) },
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const min = localInputValue(new Date(report.created_at));
  // Signing times are not in the future: up to when the dialog opened.
  const [max] = useState(() => localInputValue(new Date()));
  const complete = (r: SignerRow) =>
    r.at !== '' && (r.kind === 'user' ? r.userId !== '' : r.name.trim() !== '');
  const canSubmit = file !== null && rows.length > 0 && rows.every(complete);

  const update = (key: number, patch: Partial<SignerRow>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const add = () => {
    setRows((rs) => [
      ...rs,
      { key: nextKey, kind: 'user', userId: '', name: '', at: localInputValue(new Date()) },
    ]);
    setNextKey((k) => k + 1);
  };

  const submit = async () => {
    if (!canSubmit || file === null) return;
    const signatures: SignatureInput[] = rows.map((r) => ({
      ...(r.kind === 'user' ? { user_id: r.userId } : { name: r.name.trim() }),
      signed_at: new Date(r.at).toISOString(),
    }));
    setBusy(true);
    try {
      onSigned(await reportsApi.sign(report.id, file, signatures, note));
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

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
              onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
            >
              <DeleteIcon />
            </button>
          </div>
        ))}
        <div className="row">
          <button type="button" className="btn" onClick={add} disabled={rows.length >= 32}>
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
