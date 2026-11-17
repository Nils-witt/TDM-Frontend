import { type FormEvent, type ReactNode, useState } from 'react';
import { useOffline } from '@/api/connectivity';
import { impliedBy, type PermissionInfo, type PermissionKind } from '@/api/permissions';
import { FormActions, FormError, Section, WidgetForm } from '@/components/form';
import { EmptyState } from './WidgetStates';

type Props = {
  catalog: readonly PermissionInfo[];
  // Only permissions of this kind can be granted here.
  kind: PermissionKind;
  // What is granted now.
  granted: readonly string[];
  // Saves the grants and returns them as stored.
  onSave: (permissions: string[]) => Promise<string[]>;
  aside?: ReactNode;
};

const areaLabel = (area: string) => area.charAt(0).toUpperCase() + area.slice(1).replace('-', ' ');

// A checkbox per grantable permission of kind, by area. Implied permissions
// are ticked and disabled, and are not stored on their own.
function PermissionChecklist({ catalog, kind, granted, onSave, aside }: Props) {
  const offline = useOffline();
  // null: unchanged, showing what is stored.
  const [draft, setDraft] = useState<Set<string> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shown = catalog.filter((p) => p.kind === kind);
  const byName = new Map(catalog.map((p) => [p.name, p]));
  const current = draft ?? new Set(granted);
  const implied = impliedBy(catalog, current);
  const areas = [...new Set(shown.map((p) => p.area))];

  const toggle = (name: string, on: boolean) => {
    const next = new Set(current);
    if (on) next.add(name);
    else next.delete(name);
    setDraft(next);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft || busy) return;
    setBusy(true);
    try {
      // The API answers the same however the draft got there.
      await onSave([...draft].filter((p) => !implied.has(p)));
      setDraft(null);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <WidgetForm onSubmit={(e) => void submit(e)}>
      {shown.length === 0 && <EmptyState className="">No grantable permissions.</EmptyState>}
      {areas.map((area) => (
        <Section key={area} legend={areaLabel(area)}>
          {shown
            .filter((p) => p.area === area)
            .map((p) => {
              const isImplied = implied.has(p.name);
              const needs = p.requires.filter((r) => byName.get(r)?.kind !== kind);
              return (
                <label key={p.name} className="row" title={p.name}>
                  <input
                    type="checkbox"
                    checked={current.has(p.name) || isImplied}
                    disabled={offline || busy || isImplied}
                    onChange={(e) => toggle(p.name, e.target.checked)}
                  />
                  <span>
                    <code>{p.name}</code>
                    {isImplied && <span className="muted"> (implied)</span>}
                    <br />
                    <span className="muted">{p.description}</span>
                    {needs.length > 0 && (
                      <>
                        <br />
                        <span className="muted">
                          Only with a user function granting {needs.join(', ')}.
                        </span>
                      </>
                    )}
                  </span>
                </label>
              );
            })}
        </Section>
      ))}
      <FormActions
        submitLabel="Save"
        busy={busy}
        canSubmit={draft !== null && !offline}
        onDiscard={() => setDraft(null)}
        dirty={draft !== null}
        aside={aside}
      />
      <FormError error={error} onClose={() => setError(null)} />
    </WidgetForm>
  );
}

export default PermissionChecklist;
