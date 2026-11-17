import { type FormEvent, useId, useState } from 'react';
import { useOffline } from '@/api/connectivity';
import { type Uhs, uhsApi, uhsNameMax, useAllUhs } from '@/api/uhs';
import { useIsAdmin, useSession } from '@/app/session';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  FieldRow,
  FormActions,
  FormError,
  Section,
  SectionHeading,
  SectionText,
  WidgetForm,
} from '@/components/form';
import Spinner from '@/components/Spinner';
import { useWidgetWindows } from '@/components/widgetWindow/widgetWindowContext';
import { useCatalogs } from '@/data/catalogContext';
import styles from '../shared/CatalogManager.module.scss';

// The scope select's value of Default (an UHS without a scope).
const defaultScope = '';
const allScopes = '*';

const noUhs: readonly Uhs[] = [];

// Every scope's UHS (uhs.manage): create, rename, (de)activate, delete. Each
// UHS has a user function, created and deleted with it, whose groups are set
// in User Functions.
function UhsWidget() {
  const list = useAllUhs(true);
  const { scopes } = useCatalogs();
  const { session } = useSession();
  const admin = useIsAdmin();
  const { openWidget } = useWidgetWindows();
  const offline = useOffline();
  const [filter, setFilter] = useState(session.scope.id);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Uhs | null>(null);

  const scopeName = (id: string | null) =>
    !id ? 'Default' : (scopes.byId.get(id)?.name ?? '(deleted scope)');
  const rows = (list.data ?? noUhs)
    .filter((u) => filter === allScopes || (u.scope ?? defaultScope) === filter)
    .toSorted(
      (a, b) =>
        scopeName(a.scope).localeCompare(scopeName(b.scope)) || a.name.localeCompare(b.name),
    );

  const write = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      setError(null);
      await list.reload();
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  };

  return (
    <div>
      <SectionText>
        <span className="muted">
          Places patients are cared for, each in one scope. Every UHS has its own user function: its
          sessions see only the patients in the UHS. Grant it to groups in User Functions.
        </span>
      </SectionText>
      <CreateUhs
        defaultScope={session.scope.id}
        create={(input) => write(() => uhsApi.create(input))}
      />
      <SectionHeading>UHS</SectionHeading>
      <label className="row">
        <span className="muted">Scope</span>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value={allScopes}>All scopes</option>
          <option value={defaultScope}>Default</option>
          {scopes.items
            .toSorted((a, b) => a.name.localeCompare(b.name))
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
        </select>
      </label>
      {list.data === undefined && list.error === null ? (
        <Spinner compact />
      ) : (
        <div className={`${styles.tableWrap} mt`}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Scope</th>
                <th>Name</th>
                <th>Active</th>
                <th>Patients</th>
                <th>
                  <span className={styles.hidden}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    No UHS yet.
                  </td>
                </tr>
              )}
              {rows.map((u) => (
                <UhsRow
                  key={u.id}
                  uhs={u}
                  scopeName={scopeName(u.scope)}
                  readOnly={offline}
                  save={(fields) => write(() => uhsApi.patch(u, fields))}
                  onDelete={() => setDeleting(u)}
                  onHistory={() => openWidget('AuditLog', { entityType: 'uhs', entityId: u.id })}
                  onFunction={
                    admin && u.function
                      ? () => openWidget('UserFunctions', { functionId: u.function })
                      : undefined
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <FormError error={error ?? list.error} onClose={() => setError(null)} />
      {deleting && (
        <ConfirmDialog
          title="Delete UHS"
          message={
            <>
              <SectionText>Delete the UHS “{deleting.name}”?</SectionText>
              <SectionText>
                Its user function is deleted too, ending its sessions. Past stays keep its name.
                Deactivating it keeps both.
              </SectionText>
            </>
          }
          confirmLabel="Delete"
          onConfirm={async () => {
            await uhsApi.remove(deleting);
            setDeleting(null);
            await list.reload();
          }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

function CreateUhs({
  defaultScope: initialScope,
  create,
}: {
  defaultScope: string;
  create: (input: { name: string; scope: string | null }) => Promise<boolean>;
}) {
  const { scopes } = useCatalogs();
  const [name, setName] = useState('');
  const [scope, setScope] = useState(initialScope);
  const [busy, setBusy] = useState(false);
  const id = useId();
  const offline = useOffline();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    if (await create({ name: name.trim(), scope: scope === defaultScope ? null : scope })) {
      setName('');
    }
    setBusy(false);
  };

  if (offline) return null;

  return (
    <WidgetForm onSubmit={(e) => void submit(e)}>
      <Section legend="New UHS">
        <FieldRow id={`${id}-scope`} label="Scope" marked>
          <select
            id={`${id}-scope`}
            className="grow"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
          >
            <option value={defaultScope}>Default</option>
            {scopes.items
              .toSorted((a, b) => a.name.localeCompare(b.name))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </FieldRow>
        <FieldRow id={`${id}-name`} label="Name" marked>
          <input
            id={`${id}-name`}
            className="grow"
            value={name}
            maxLength={uhsNameMax}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
            required
          />
        </FieldRow>
      </Section>
      <FormActions submitLabel="Create" busy={busy} canSubmit={name.trim() !== ''} />
    </WidgetForm>
  );
}

type RowProps = {
  uhs: Uhs;
  scopeName: string;
  readOnly: boolean;
  // false keeps the row in edit mode.
  save: (fields: { name?: string; active?: boolean }) => Promise<boolean>;
  onDelete: () => void;
  onHistory: () => void;
  // Opens its user function; undefined for non-admins.
  onFunction?: () => void;
};

function UhsRow({ uhs, scopeName, readOnly, save, onDelete, onHistory, onFunction }: RowProps) {
  const [name, setName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const formId = useId();
  const patients = uhs.patient_count ?? 0;

  const run = async (fields: { name?: string; active?: boolean }) => {
    setBusy(true);
    const ok = await save(fields);
    setBusy(false);
    return ok;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (name === null || busy) return;
    if (name.trim() === uhs.name || (await run({ name: name.trim() }))) setName(null);
  };

  return (
    <tr className={uhs.active ? undefined : styles.dimmed}>
      <td>{scopeName}</td>
      <td>
        {name === null ? (
          uhs.name
        ) : (
          <input
            form={formId}
            aria-label="Name"
            value={name}
            maxLength={uhsNameMax}
            autoFocus
            required
            onChange={(e) => setName(e.target.value)}
          />
        )}
      </td>
      <td>
        <input
          type="checkbox"
          aria-label={`${uhs.name} active`}
          checked={uhs.active}
          disabled={readOnly || busy}
          title={uhs.active ? 'Deactivating ends the sessions of its function.' : undefined}
          onChange={(e) => void run({ active: e.target.checked })}
        />
      </td>
      <td>{patients}</td>
      <td className={styles.actions}>
        <form id={formId} className="row" onSubmit={(e) => void submit(e)}>
          {name === null ? (
            <>
              <button
                type="button"
                className="btn"
                disabled={readOnly}
                onClick={() => setName(uhs.name)}
              >
                Rename
              </button>
              {onFunction && (
                <button type="button" className="btn" onClick={onFunction}>
                  Function
                </button>
              )}
              <button type="button" className="btn" onClick={onHistory}>
                History
              </button>
              <button
                type="button"
                className="btn danger"
                disabled={readOnly || patients > 0}
                title={patients > 0 ? 'Patients are in it: move or remove them first.' : undefined}
                onClick={onDelete}
              >
                Delete
              </button>
            </>
          ) : (
            <>
              <button type="submit" className="btn primary" disabled={busy || !name.trim()}>
                Save
              </button>
              <button type="button" className="btn" disabled={busy} onClick={() => setName(null)}>
                Cancel
              </button>
            </>
          )}
        </form>
      </td>
    </tr>
  );
}

export default UhsWidget;
