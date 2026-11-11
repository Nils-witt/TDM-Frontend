import { useMemo, useState } from 'react';
import { memberName, type User } from '@/api/directory';
import { type Report, type SignatureInput, reportsApi } from '@/api/reports';
import { localInputValue } from './reportHelpers';

// A user, or an external signer by name; the time is local.
export type SignerRow = {
  key: number;
  kind: 'user' | 'external';
  userId: string;
  name: string;
  at: string;
};

export const maxSigners = 32;

const newRow = (key: number): SignerRow => ({
  key,
  kind: 'user',
  userId: '',
  name: '',
  at: localInputValue(new Date()),
});

// The Upload signed report dialog's state, shared by the dashboard and the
// responsive UI. A report is signed once.
export function useSignReport({
  report,
  users,
  onSigned,
}: {
  report: Report;
  users: readonly User[];
  onSigned: (r: Report) => void;
}) {
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
  const [rows, setRows] = useState<SignerRow[]>(() => [newRow(0)]);
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
    setRows((rs) => [...rs, newRow(nextKey)]);
    setNextKey((k) => k + 1);
  };
  const remove = (key: number) => setRows((rs) => rs.filter((r) => r.key !== key));

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

  return {
    live,
    file,
    setFile,
    note,
    setNote,
    rows,
    update,
    add,
    remove,
    canAdd: rows.length < maxSigners,
    min,
    max,
    canSubmit,
    busy,
    error,
    setError,
    submit,
  };
}
