import { type FormEvent, useId, useState } from 'react';
import { useOffline } from '@/api/connectivity';
import {
  activeTags,
  canChangeTag,
  type MessageTag,
  messageTagsApi,
  useMessageTags,
} from '@/api/messageTags';
import { useHasPermission, useIsAdmin } from '@/app/session';
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
import { DeleteIcon } from '@/components/icons';
import Spinner from '@/components/Spinner';
import { useWidgetWindows } from '@/components/widgetWindow/widgetWindowContext';
import { formatTime } from '../shared/logbookEntries';
import MessageTagChip from '../shared/MessageTagChip';
import styles from '../shared/CatalogManager.module.scss';

const defaultColor = '#1976d2';

// The tags messages can be given: the global ones (every scope, admins only)
// and the session scope's (anyone with messages.view). Deleting keeps a tag
// on its messages.
function MessageTagsWidget() {
  const admin = useIsAdmin();
  const canView = useHasPermission('messages.view');
  const offline = useOffline();
  const tags = useMessageTags(!offline && (admin || canView));
  const { openWidget } = useWidgetWindows();
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<MessageTag | null>(null);

  if (offline) return <SectionText>Message tags are not available offline.</SectionText>;
  if (tags.data === undefined && tags.error === null) return <Spinner compact />;

  const rows = activeTags(tags.data);

  const write = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      setError(null);
      await tags.reload();
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  };

  return (
    <div>
      <SectionHeading>Message tags</SectionHeading>
      <CreateTag
        admin={admin}
        create={async (input) => {
          await messageTagsApi.create(input);
          await tags.reload();
        }}
      />
      <div className={`${styles.tableWrap} mt`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Tag</th>
              <th>Applies to</th>
              <th>Changed</th>
              <th>
                <span className={styles.hidden}>Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">
                  No tags yet.
                </td>
              </tr>
            )}
            {rows.map((t) => (
              <TagRow
                key={t.id}
                tag={t}
                changeable={canChangeTag(t, admin, canView)}
                save={(input) => write(() => messageTagsApi.patch(t, input))}
                onDelete={() => setDeleting(t)}
                onHistory={() =>
                  openWidget('AuditLog', { entityType: 'message_tags', entityId: t.id })
                }
              />
            ))}
          </tbody>
        </table>
      </div>
      <FormError error={error ?? tags.error} onClose={() => setError(null)} />
      {deleting && (
        <ConfirmDialog
          title="Delete tag"
          message={
            <SectionText>
              Delete the tag “{deleting.name}”? Messages keep it, but it is no longer offered.
            </SectionText>
          }
          confirmLabel="Delete"
          onConfirm={async () => {
            await messageTagsApi.remove(deleting);
            setDeleting(null);
            await tags.reload();
          }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

function CreateTag({
  admin,
  create,
}: {
  admin: boolean;
  create: (input: { name: string; color: string; global: boolean }) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(defaultColor);
  const [global, setGlobal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await create({ name: name.trim(), color, global });
      setName('');
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <WidgetForm onSubmit={(e) => void submit(e)}>
      <Section legend="New tag">
        <FieldRow id={`${id}-name`} label="Name" marked>
          <input
            id={`${id}-name`}
            className="grow"
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
            required
          />
        </FieldRow>
        <FieldRow id={`${id}-color`} label="Color">
          <input
            id={`${id}-color`}
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </FieldRow>
        {admin && (
          <FieldRow id={`${id}-global`} label="Global">
            <label className="row">
              <input
                id={`${id}-global`}
                type="checkbox"
                checked={global}
                onChange={(e) => setGlobal(e.target.checked)}
              />
              Offered in every scope
            </label>
          </FieldRow>
        )}
      </Section>
      <FormActions submitLabel="Create" busy={busy} canSubmit={name.trim() !== ''} />
      <FormError error={error} onClose={() => setError(null)} />
    </WidgetForm>
  );
}

type TagRowProps = {
  tag: MessageTag;
  changeable: boolean;
  save: (input: { name?: string; color?: string }) => Promise<boolean>;
  onDelete: () => void;
  onHistory: () => void;
};

function TagRow({ tag, changeable, save, onDelete, onHistory }: TagRowProps) {
  const [edit, setEdit] = useState<{ name: string; color: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const formId = useId();
  const hint = changeable ? undefined : 'Global tags are changed by admins.';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!edit || busy) return;
    const input: { name?: string; color?: string } = {};
    if (edit.name.trim() !== tag.name) input.name = edit.name.trim();
    if (edit.color !== tag.color) input.color = edit.color;
    if (Object.keys(input).length === 0) {
      setEdit(null);
      return;
    }
    setBusy(true);
    const ok = await save(input);
    setBusy(false);
    if (ok) setEdit(null);
  };

  return (
    <tr>
      <td>
        {edit ? (
          <span className="row">
            <input
              form={formId}
              type="color"
              aria-label="Color"
              value={edit.color}
              onChange={(e) => setEdit({ ...edit, color: e.target.value })}
            />
            <input
              form={formId}
              aria-label="Name"
              value={edit.name}
              maxLength={100}
              onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              autoComplete="off"
              required
            />
          </span>
        ) : (
          <MessageTagChip tag={tag} />
        )}
      </td>
      <td>{tag.global ? 'Every scope' : 'This scope'}</td>
      <td className={styles.meta}>
        {formatTime(tag.updated_at)} · {tag.updated_by}
      </td>
      <td className={styles.actions}>
        {edit ? (
          <form id={formId} onSubmit={(e) => void submit(e)} className="row">
            <button type="submit" className="btn primary" disabled={busy}>
              Save
            </button>
            <button type="button" className="btn" onClick={() => setEdit(null)} disabled={busy}>
              Cancel
            </button>
          </form>
        ) : (
          <div>
            <button
              type="button"
              className="btn"
              disabled={!changeable}
              title={hint}
              onClick={() => setEdit({ name: tag.name, color: tag.color })}
            >
              Edit
            </button>
            <button type="button" className="btn" onClick={onHistory}>
              History
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label={`Delete ${tag.name}`}
              title={hint ?? 'Delete'}
              disabled={!changeable}
              onClick={onDelete}
            >
              <DeleteIcon />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

export default MessageTagsWidget;
