import { type FormEvent, useEffect, useRef, useState } from 'react';
import type { Principal } from '@/api/auth';
import {
  choicesPath,
  fetchChoices,
  fixedScopeOf,
  lastChoice,
  type SessionChoice,
  type SessionChoices,
} from '@/api/sessions';
import Alert from '@/components/Alert';
import Spinner from '@/components/Spinner';
import styles from './SessionPicker.module.scss';

type Props = {
  principal: Principal;
  // Starts (or switches to) the session; the picker shows its error.
  onChoose: (c: SessionChoice) => Promise<void>;
  // The current choice, preselected when switching.
  current?: SessionChoice;
  // Shown beside the choose button, e.g. Log Out or Cancel.
  secondary?: { label: string; onClick: () => void };
  // Why the picker shows, e.g. that the session ended.
  notice?: string | null;
  title?: string;
};

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

// An empty scope ID is the Default scope (missions and units without one).
const scopeLabel = (s: { id: string; name: string }) => (s.id === '' ? 'Default' : s.name);

// Picks the user function and mission scope to work as. Without any function
// to choose the user cannot sign in.
export function SessionChooser({ principal, onChoose, current, secondary, notice, title }: Props) {
  const [choices, setChoices] = useState<SessionChoices | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fn, setFn] = useState('');
  const [scope, setScope] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchChoices(choicesPath).then(
      (c) => {
        if (cancelled) return;
        setChoices(c);
        const preset = current ?? lastChoice(principal);
        const fnOk = preset && c.functions.some((f) => f.id === preset.function);
        setFn(fnOk ? preset.function : (c.functions[0]?.id ?? ''));
        const scopeOk = preset && c.scopes.some((s) => s.id === (preset.scope ?? ''));
        setScope(scopeOk ? (preset.scope ?? '') : '');
      },
      (err: unknown) => {
        if (!cancelled) setLoadError(message(err));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [principal, current]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !fn) return;
    setBusy(true);
    setError(null);
    try {
      const fixedScope = fixedScopeOf(choices?.functions.find((f) => f.id === fn));
      const chosen = fixedScope === undefined ? scope : (fixedScope ?? '');
      await onChoose({ function: fn, scope: chosen === '' ? null : chosen });
    } catch (err) {
      setError(message(err));
      setBusy(false);
    }
  };

  if (loadError) return <Alert severity="error">{loadError}</Alert>;
  if (!choices) return <Spinner compact />;
  const selected = choices.functions.find((f) => f.id === fn);
  // An UHS function works in its UHS's scope only.
  const fixed = fixedScopeOf(selected);
  const shownScope = fixed === undefined ? scope : (fixed ?? '');

  if (choices.functions.length === 0) {
    return (
      <div className={styles.body}>
        <Alert severity="warning">
          No user function is assigned to you, so you cannot sign in. Ask an administrator to give
          one of your groups a function.
        </Alert>
        {secondary && (
          <div className={styles.actions}>
            <button type="button" className="btn" onClick={secondary.onClick}>
              {secondary.label}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <form className={styles.body} onSubmit={(e) => void submit(e)}>
      {title && <h2 className="small">{title}</h2>}
      {notice && <Alert severity="warning">{notice}</Alert>}
      <label className={styles.field}>
        <span>Function</span>
        <select value={fn} onChange={(e) => setFn(e.target.value)} disabled={busy}>
          {choices.functions.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
              {f.uhs ? ' (UHS)' : ''}
            </option>
          ))}
        </select>
      </label>
      {selected?.description && <p className={styles.description}>{selected.description}</p>}
      <label className={styles.field}>
        <span>Scope</span>
        <select
          value={shownScope}
          onChange={(e) => setScope(e.target.value)}
          disabled={busy || fixed !== undefined}
          title={fixed !== undefined ? 'An UHS function works in the scope of its UHS.' : undefined}
        >
          {choices.scopes.map((s) => (
            <option key={s.id} value={s.id}>
              {scopeLabel(s)}
            </option>
          ))}
        </select>
      </label>
      <p className={styles.description}>
        {selected?.uhs
          ? `You see and change only the patients in the UHS ${selected.uhs.name}.`
          : 'You see and change only the missions, patients and units of this scope.'}
      </p>
      {error && <Alert severity="error">{error}</Alert>}
      <div className={styles.actions}>
        <button type="submit" className="btn primary" disabled={busy || !fn}>
          Continue
        </button>
        {secondary && (
          <button type="button" className="btn" disabled={busy} onClick={secondary.onClick}>
            {secondary.label}
          </button>
        )}
      </div>
    </form>
  );
}

// The page shown after signing in until a session is chosen.
export function SessionPage(props: Props) {
  return (
    <main className={`container ${styles.narrow}`}>
      <div className="card">
        <h1 className="small">Choose your function</h1>
        <SessionChooser {...props} />
      </div>
    </main>
  );
}

// The picker as a modal dialog, for switching while signed in.
export function SessionDialog({ onClose, ...props }: Props & { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-label="Switch function or scope"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <SessionChooser
        {...props}
        title="Switch function or scope"
        secondary={{ label: 'Cancel', onClick: onClose }}
      />
    </dialog>
  );
}
