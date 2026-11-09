import type { LayoutScope } from '@/api/layouts';
import { type FormEvent, useEffect, useState } from 'react';
import { FormActions, FormError, WidgetForm } from '@/components/form';
import { defaultItem } from './layout';
import { menuBadgeClass } from '@/components/menu/menuClasses';
import { useLayoutActions, useLayoutDraft, useLayoutView } from './layoutContext';
import { scopeLabel } from './sharing';
import { widgets } from './widgets/registry';
import WidgetPicker from './WidgetPicker';
import styles from './LayoutEditBar.module.scss';

function LayoutEditBar() {
  const { draft, canUndo, canRedo, save } = useLayoutDraft();
  const { updateDraft, undo, redo, cancelEdit } = useLayoutActions();
  const { canWrite } = useLayoutView();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);

  // Escape discards; ⌘Z / ⇧⌘Z (Ctrl elsewhere) undo and redo, unless typed into
  // a field, which keeps its own undo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, select, textarea, [contenteditable]')) return;
      if (e.key === 'Escape') {
        cancelEdit();
        return;
      }
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === 'z' || key === 'y') {
        e.preventDefault();
        if (key === 'y' || e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cancelEdit, undo, redo]);

  if (!draft) return null;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    save().then(
      () => setSaving(false),
      (err: unknown) => {
        setSaving(false);
        setError(err instanceof Error ? err.message : String(err));
      },
    );
  };

  const add = (id: string) => {
    const w = widgets[id];
    if (w) updateDraft({ widgets: [...draft.widgets, defaultItem(id, w)] });
  };

  // Admins may share a layout with everyone, or make a shared one their own.
  // Groups are chosen with View → Share…, so group is offered only to keep
  // a group layout's groups.
  const scopes = (
    draft.target?.scope === 'group'
      ? (['user', 'group', 'global'] as const)
      : (['user', 'global'] as const)
  ).filter(canWrite);

  return (
    <>
      <WidgetForm
        className={`card ${styles.bar}`}
        onSubmit={onSubmit}
        aria-label="Edit layout"
        data-tour="layout-edit-bar"
      >
        <div className={styles.row}>
          <input
            aria-label="Layout name"
            placeholder="Layout name"
            value={draft.name}
            required
            onChange={(e) => updateDraft({ name: e.target.value })}
          />
          {scopes.length < 2 ? (
            <span className={menuBadgeClass}>{scopeLabel(draft.scope)}</span>
          ) : (
            <select
              aria-label="Visible to"
              value={draft.scope}
              onChange={(e) => updateDraft({ scope: e.target.value as LayoutScope })}
            >
              {scopes.map((s) => (
                <option key={s} value={s}>
                  {s === 'global'
                    ? 'Shared (everyone)'
                    : s === 'group'
                      ? `Groups: ${draft.target?.groups.join(', ')}`
                      : 'My layout'}
                </option>
              ))}
            </select>
          )}
          <button type="button" className="btn" onClick={() => setPicking(true)}>
            Add widget…
          </button>
          <FormActions
            submitLabel="Save"
            canSubmit={draft.name.trim() !== ''}
            busy={saving}
            onDiscard={cancelEdit}
            discardLabel="Cancel"
            extra={
              <>
                <button
                  type="button"
                  className="btn"
                  onClick={undo}
                  disabled={!canUndo}
                  aria-label="Undo"
                  title="Undo (⌘Z)"
                >
                  ↶
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={redo}
                  disabled={!canRedo}
                  aria-label="Redo"
                  title="Redo (⇧⌘Z)"
                >
                  ↷
                </button>
              </>
            }
          />
        </div>
        <FormError error={error} onClose={() => setError(null)} />
      </WidgetForm>
      {/* Outside the form, so Enter in its search does not submit the layout. */}
      {picking && <WidgetPicker onAdd={add} onClose={() => setPicking(false)} />}
    </>
  );
}

export default LayoutEditBar;
