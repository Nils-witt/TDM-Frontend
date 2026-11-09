import { type FormEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import { fetchGroups, groupsPath } from '@/api/directory';
import type { Layout, LayoutScope, Sharing } from '@/api/layouts';
import { useResource } from '@/api/resource';
import { FormActions, FormError, SectionText, WidgetForm } from '@/components/form';
import dialogStyles from '@/components/ConfirmDialog.module.scss';
import styles from './ShareDialog.module.scss';

type Props = {
  layout: Pick<Layout, 'name' | 'scope' | 'groups' | 'owner'>;
  // The dialog shows the error it rejects with and stays open; the parent
  // unmounts it on success.
  onSave: (sharing: Sharing) => Promise<void>;
  onCancel: () => void;
};

// For admins: who sees a layout. The groups are offered from the directory
// (only groups with members); a name may also be typed, for groups that only
// the identity provider knows.
function ShareDialog({ layout, onSave, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [scope, setScope] = useState<LayoutScope>(layout.scope);
  const [groups, setGroups] = useState<string[]>(layout.groups);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const directory = useResource(groupsPath, fetchGroups);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  // The directory's names and those already chosen, once each.
  const names = useMemo(
    () =>
      [...new Set([...(directory.data ?? []).map((g) => g.name), ...layout.groups])].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' }),
      ),
    [directory.data, layout.groups],
  );
  const offered = [...names, ...groups.filter((g) => !names.includes(g))];

  const toggle = (name: string, on: boolean) =>
    setGroups((gs) => (on ? [...gs, name] : gs.filter((g) => g !== name)));

  const addTyped = () => {
    const name = typed.trim();
    if (name !== '' && !groups.includes(name)) setGroups((gs) => [...gs, name]);
    setTyped('');
  };

  const valid = scope !== 'group' || groups.length > 0;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !valid) return;
    setBusy(true);
    setError(null);
    try {
      await onSave({ scope, groups: scope === 'group' ? groups : [] });
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  const cancel = () => {
    if (!busy) onCancel();
  };

  // Personal for an admin's own or a shared layout makes it the admin's.
  const personal =
    layout.scope === 'user' && layout.owner ? `Only ${layout.owner}` : 'Only me (personal)';

  return (
    <dialog
      ref={ref}
      className={dialogStyles.dialog}
      aria-labelledby={`${id}-title`}
      onCancel={(e) => {
        e.preventDefault();
        cancel();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) cancel();
      }}
    >
      <WidgetForm onSubmit={(e) => void save(e)}>
        <h2 id={`${id}-title`}>Share “{layout.name}”</h2>
        <div className={dialogStyles.message}>
          <SectionText>
            <span className="muted">
              Users who no longer see it and had it as their default get the built-in layout.
            </span>
          </SectionText>
          <label className="row">
            <input
              type="radio"
              name={`${id}-scope`}
              checked={scope === 'user'}
              onChange={() => setScope('user')}
            />
            {personal}
          </label>
          <label className="row">
            <input
              type="radio"
              name={`${id}-scope`}
              checked={scope === 'global'}
              onChange={() => setScope('global')}
            />
            Everyone
          </label>
          <label className="row">
            <input
              type="radio"
              name={`${id}-scope`}
              checked={scope === 'group'}
              onChange={() => setScope('group')}
            />
            Members of these groups
          </label>
          {scope === 'group' && (
            <>
              <div className={styles.groups} role="group" aria-label="Groups">
                {offered.length === 0 && (
                  <span className="muted">
                    {directory.error ? 'The directory is unavailable.' : 'No groups found.'}
                  </span>
                )}
                {offered.map((name) => (
                  <label key={name} className="row">
                    <input
                      type="checkbox"
                      checked={groups.includes(name)}
                      onChange={(e) => toggle(name, e.target.checked)}
                    />
                    {name}
                  </label>
                ))}
              </div>
              <div className={`row ${styles.add}`}>
                <input
                  className="grow"
                  aria-label="Other group name"
                  placeholder="Other group name"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTyped();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn"
                  onClick={addTyped}
                  disabled={typed.trim() === ''}
                >
                  Add
                </button>
              </div>
            </>
          )}
        </div>
        <FormActions
          submitLabel="Save"
          busy={busy}
          canSubmit={valid}
          onDiscard={cancel}
          discardLabel="Cancel"
        />
        <FormError error={error} onClose={() => setError(null)} />
      </WidgetForm>
    </dialog>
  );
}

export default ShareDialog;
