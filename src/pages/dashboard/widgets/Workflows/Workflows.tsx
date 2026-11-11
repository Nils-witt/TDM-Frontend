import { useState } from 'react';
import { useOffline } from '@/api/connectivity';
import { useErrorState } from '@/api/resource';
import { type Workflow, workflowsApi, useWorkflowCatalog, useWorkflows } from '@/api/workflows';
import ConfirmDialog from '@/components/ConfirmDialog';
import { FormError, SectionHeading, SectionText, sectionStack } from '@/components/form';
import { DeleteIcon } from '@/components/icons';
import Spinner from '@/components/Spinner';
import { useWidgetWindows } from '@/components/widgetWindow/widgetWindowContext';
import { formatTime } from '../shared/logbookEntries';
import WidgetActionBar, { WidgetAction } from '../shared/WidgetActionBar';
import { EmptyState } from '../shared/WidgetStates';
import table from '../shared/CatalogManager.module.scss';
import { summary } from './graph';
import { WorkflowEditor } from './WorkflowEditor';

function WorkflowsWidget() {
  const workflows = useWorkflows();
  const { catalog, error: catalogError } = useWorkflowCatalog();
  const { openWidget } = useWidgetWindows();
  const offline = useOffline();
  const [error, setError] = useErrorState(workflows.error ?? catalogError);
  const [editing, setEditing] = useState<Workflow | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Workflow | null>(null);
  const rows = workflows.items.toSorted((a, b) => a.name.localeCompare(b.name));

  const write = async (fn: () => Promise<unknown>): Promise<boolean> => {
    try {
      await fn();
      setError(null);
      await workflows.reload();
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  };

  if (editing !== null && catalog) {
    return (
      <div className={sectionStack}>
        <WorkflowEditor
          key={editing === 'new' ? 'new' : editing.id}
          workflow={editing === 'new' ? null : editing}
          catalog={catalog}
          readOnly={offline}
          onSave={async (input) => {
            const ok = await write(() =>
              editing === 'new'
                ? workflowsApi.create(input)
                : workflowsApi.patch(editing.id, input),
            );
            if (ok) setEditing(null);
          }}
          onCancel={() => {
            setError(null);
            setEditing(null);
          }}
        />
        <FormError error={error} onClose={() => setError(null)} />
      </div>
    );
  }

  return (
    <div className={sectionStack}>
      <WidgetActionBar label="Workflows">
        <WidgetAction disabled={offline || !catalog} onClick={() => setEditing('new')}>
          Add workflow
        </WidgetAction>
      </WidgetActionBar>
      <SectionText>
        Workflows run on the API when their trigger happens, such as a mission being created or
        changing its status, or a task being done or due: filters decide where a run goes on, and
        actions change missions, add logbook entries, create tasks or store values for the actions
        after them. Their changes are recorded as made by <code>workflow:&lt;name&gt;</code>.
      </SectionText>
      <SectionHeading>Workflows</SectionHeading>
      {workflows.loading ? (
        <Spinner compact />
      ) : rows.length === 0 ? (
        <EmptyState className="">No workflows yet.</EmptyState>
      ) : (
        <div className={table.tableWrap}>
          <table className={table.table}>
            <thead>
              <tr>
                <th>Enabled</th>
                <th>Name</th>
                <th>Rule</th>
                <th>Changed</th>
                <th>
                  <span className={table.hidden}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((w) => (
                <tr key={w.id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Workflow ${w.name} enabled`}
                      checked={w.enabled}
                      disabled={offline}
                      onChange={(e) =>
                        void write(() => workflowsApi.patch(w.id, { enabled: e.target.checked }))
                      }
                    />
                  </td>
                  <td>{w.name}</td>
                  <td className={table.dimmed}>{summary(catalog, w.graph)}</td>
                  <td className={table.meta}>
                    {formatTime(w.updated_at)} · {w.updated_by}
                  </td>
                  <td className={table.actions}>
                    <span className="row">
                      <button
                        type="button"
                        className="btn"
                        disabled={offline || !catalog}
                        onClick={() => setEditing(w)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() =>
                          openWidget('AuditLog', { entityType: 'workflows', entityId: w.id })
                        }
                      >
                        History
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Delete the workflow ${w.name}`}
                        title="Delete"
                        disabled={offline}
                        onClick={() => setDeleting(w)}
                      >
                        <DeleteIcon />
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <FormError error={error} onClose={() => setError(null)} />
      {deleting && (
        <ConfirmDialog
          title="Delete workflow"
          message={
            <SectionText>
              Delete the workflow <strong>{deleting.name}</strong>? It no longer runs.
            </SectionText>
          }
          confirmLabel="Delete"
          onConfirm={async () => {
            await workflowsApi.remove(deleting.id);
            setDeleting(null);
            await workflows.reload();
          }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

export default WorkflowsWidget;
