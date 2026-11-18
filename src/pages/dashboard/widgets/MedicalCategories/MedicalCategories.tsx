import { type FormEvent, useId, useState } from 'react';
import { useOffline } from '@/api/connectivity';
import {
  type MedicalCategory,
  type MedicalCategoryInput,
  type MedicalCategoryNode,
  medicalCategoriesApi,
  medicalCategorySubtree,
  medicalCategoryTree,
  useMedicalCategories,
} from '@/api/medicalCategories';
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
import styles from '../shared/CatalogManager.module.scss';
import { formatTime } from '../shared/logbookEntries';

// The parent choices: Top level, then the tree indented, without what may not
// become the parent (the category itself and those below it).
function ParentOptions({ tree, exclude }: { tree: MedicalCategoryNode[]; exclude?: Set<string> }) {
  return (
    <>
      <option value="">(Top level)</option>
      {tree
        .filter((n) => !exclude?.has(n.category.id))
        .map((n) => (
          <option key={n.category.id} value={n.category.id}>
            {'   '.repeat(n.depth) + n.category.name}
          </option>
        ))}
    </>
  );
}

// The medical categories patients are given, as a tree: a category may have
// a parent. The API refuses a parent below the category itself and deleting a
// category with subcategories; patients keep a deleted category.
function MedicalCategoriesWidget() {
  const { openWidget } = useWidgetWindows();
  const resource = useMedicalCategories();
  const categories = resource.data ?? [];
  const tree = medicalCategoryTree(categories);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<MedicalCategory | null>(null);

  const write = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      setError(null);
      await resource.reload();
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  };

  return (
    <div>
      <SectionHeading>Medical categories</SectionHeading>
      <CreateCategory
        tree={tree}
        create={async (input) => {
          await medicalCategoriesApi.create(input);
          await resource.reload();
        }}
      />
      {resource.data === undefined && resource.error === null ? (
        <Spinner compact />
      ) : (
        <div className={`${styles.tableWrap} mt`}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Parent</th>
                <th>Changed</th>
                <th>
                  <span className={styles.hidden}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {tree.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted">
                    No medical categories yet.
                  </td>
                </tr>
              )}
              {tree.map((n) => (
                <CategoryRow
                  key={n.category.id}
                  node={n}
                  tree={tree}
                  categories={categories}
                  save={(input) => write(() => medicalCategoriesApi.patch(n.category.id, input))}
                  onDelete={() => setDeleting(n.category)}
                  onHistory={() =>
                    openWidget('AuditLog', {
                      entityType: 'medical_categories',
                      entityId: n.category.id,
                    })
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <FormError error={error ?? resource.error} onClose={() => setError(null)} />
      {deleting && (
        <ConfirmDialog
          title="Delete medical category"
          message={
            <>
              <SectionText>Delete the medical category “{deleting.name}”?</SectionText>
              <SectionText>
                Patients given it keep it, but it is no longer offered. A category with
                subcategories cannot be deleted.
              </SectionText>
            </>
          }
          confirmLabel="Delete"
          onConfirm={async () => {
            await medicalCategoriesApi.remove(deleting.id);
            setDeleting(null);
            await resource.reload();
          }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

// The chosen parent stays selected for the next category.
function CreateCategory({
  tree,
  create,
}: {
  tree: MedicalCategoryNode[];
  create: (input: MedicalCategoryInput) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [parent, setParent] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  const offline = useOffline();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await create({ name: name.trim(), parent_id: parent === '' ? null : parent });
      setName('');
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (offline) return null;

  // A chosen parent deleted elsewhere falls back to the top level.
  const parentValue = tree.some((n) => n.category.id === parent) ? parent : '';
  return (
    <WidgetForm onSubmit={(e) => void submit(e)}>
      <Section legend="New medical category">
        <FieldRow id={`${id}-parent`} label="Parent">
          <select
            id={`${id}-parent`}
            className="grow"
            value={parentValue}
            onChange={(e) => setParent(e.target.value)}
          >
            <ParentOptions tree={tree} />
          </select>
        </FieldRow>
        <FieldRow id={`${id}-name`} label="Name" marked>
          <input
            id={`${id}-name`}
            className="grow"
            value={name}
            maxLength={200}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
            required
          />
        </FieldRow>
      </Section>
      <FormActions submitLabel="Create" busy={busy} canSubmit={name.trim() !== ''} />
      <FormError error={error} onClose={() => setError(null)} />
    </WidgetForm>
  );
}

type RowProps = {
  node: MedicalCategoryNode;
  tree: MedicalCategoryNode[];
  categories: readonly MedicalCategory[];
  // Sends only the changed fields; false keeps the row in edit mode.
  save: (input: Partial<MedicalCategoryInput>) => Promise<boolean>;
  onDelete: () => void;
  onHistory: () => void;
};

// While edited, the inputs belong to a form placed in the actions cell, as a
// form cannot wrap a table row.
function CategoryRow({ node, tree, categories, save, onDelete, onHistory }: RowProps) {
  const { category, depth } = node;
  const [edit, setEdit] = useState<{ name: string; parent: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const formId = useId();
  const offline = useOffline();
  const parentName = categories.find((c) => c.id === category.parent_id)?.name ?? '';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!edit || busy) return;
    const input: Partial<MedicalCategoryInput> = {};
    if (edit.name.trim() !== category.name) input.name = edit.name.trim();
    if (edit.parent !== (category.parent_id ?? '')) {
      input.parent_id = edit.parent === '' ? null : edit.parent;
    }
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
      <td style={{ paddingLeft: `${0.5 + depth * 1.25}rem` }}>
        {edit ? (
          <input
            form={formId}
            aria-label="Name"
            value={edit.name}
            maxLength={200}
            onChange={(e) => setEdit({ ...edit, name: e.target.value })}
            autoComplete="off"
            required
          />
        ) : (
          category.name
        )}
      </td>
      <td>
        {edit ? (
          <select
            form={formId}
            aria-label="Parent"
            value={edit.parent}
            onChange={(e) => setEdit({ ...edit, parent: e.target.value })}
          >
            <ParentOptions tree={tree} exclude={medicalCategorySubtree(categories, category.id)} />
          </select>
        ) : (
          <span className="muted">{parentName}</span>
        )}
      </td>
      <td className={styles.meta}>
        {formatTime(category.updated_at)} · {category.updated_by}
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
              disabled={offline}
              onClick={() => setEdit({ name: category.name, parent: category.parent_id ?? '' })}
            >
              Edit
            </button>
            <button type="button" className="btn" onClick={onHistory}>
              History
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label={`Delete ${category.name}`}
              title="Delete"
              disabled={offline}
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

export default MedicalCategoriesWidget;
