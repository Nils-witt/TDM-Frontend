import { useState } from 'react';
import { type ExportTemplate, exportTemplatesApi, useExportTemplates } from '@/api/exportTemplates';
import { useErrorState } from '@/api/resource';
import ConfirmDialog from '@/components/ConfirmDialog';
import { FormError, SectionHeading, SectionText, sectionStack } from '@/components/form';
import { DeleteIcon } from '@/components/icons';
import Spinner from '@/components/Spinner';
import { useWidgetWindows } from '@/components/widgetWindow/widgetWindowContext';
import { formatTime } from '../shared/logbookEntries';
import { EmptyState } from '../shared/WidgetStates';
import table from '../shared/CatalogManager.module.scss';
import { TemplateEditor } from './TemplateEditor';

const starter = `<style>
  h1 { font-size: 18pt; }
  table { width: 100%; border-collapse: collapse; }
  td, th { text-align: left; padding: 2px 6px; border-bottom: 1px solid #ccc; }
  .revoked { text-decoration: line-through; color: #777; }
</style>

<h1>{{ mission.event }}</h1>
<p>{{ mission.status_label }} · {{ mission.address.text }}</p>

<table>
  {% for e in entries %}
  <tr{% if e.revoked %} class="revoked"{% endif %}>
    <td>{{ e.number }}</td>
    <td>{{ e.created_at|date:"02.01.2006 15:04" }}</td>
    <td>{{ e.text|linebreaksbr }}</td>
  </tr>
  {% endfor %}
</table>
`;

// The collection is the shared one the Intermediate Report dialog and the Reports widget
// read, so a reload after a write updates their template pickers.
function ExportTemplatesWidget() {
  const templates = useExportTemplates();
  const { openWidget } = useWidgetWindows();
  const [error, setError] = useErrorState(templates.error);
  const [editing, setEditing] = useState<ExportTemplate | 'new' | null>(null);
  const [deleting, setDeleting] = useState<ExportTemplate | null>(null);
  const rows = templates.items.toSorted((a, b) => a.name.localeCompare(b.name));

  if (editing !== null) {
    return (
      <div className={sectionStack}>
        <TemplateEditor
          key={editing === 'new' ? 'new' : editing.id}
          template={editing === 'new' ? null : editing}
          starter={starter}
          onSave={async (input) => {
            try {
              await (editing === 'new'
                ? exportTemplatesApi.create(input)
                : exportTemplatesApi.patch(editing.id, input));
              setError(null);
              setEditing(null);
              await templates.reload();
            } catch (err) {
              setError((err as Error).message);
            }
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
      <SectionText>
        Intermediate and final reports are made with these templates as PDF. Every user picks one
        under Missions → Intermediate Report or when creating a report.
      </SectionText>
      <SectionHeading>Export templates</SectionHeading>
      {templates.loading ? (
        <Spinner compact />
      ) : rows.length === 0 ? (
        <EmptyState className="">No export templates yet.</EmptyState>
      ) : (
        <div className={table.tableWrap}>
          <table className={table.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Changed</th>
                <th>
                  <span className={table.hidden}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td className={table.meta}>
                    {formatTime(t.updated_at)} · {t.updated_by}
                  </td>
                  <td className={table.actions}>
                    <span className="row">
                      <button type="button" className="btn" onClick={() => setEditing(t)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() =>
                          openWidget('AuditLog', { entityType: 'export_templates', entityId: t.id })
                        }
                      >
                        History
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Delete the export template ${t.name}`}
                        title="Delete"
                        onClick={() => setDeleting(t)}
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
      <div className="row">
        <button type="button" className="btn primary" onClick={() => setEditing('new')}>
          Add template
        </button>
      </div>
      <FormError error={error} onClose={() => setError(null)} />
      {deleting && (
        <ConfirmDialog
          title="Delete export template"
          message={
            <SectionText>
              Delete the export template <strong>{deleting.name}</strong>? Missions can no longer be
              printed with it; reports made with it keep their PDFs.
            </SectionText>
          }
          confirmLabel="Delete"
          onConfirm={async () => {
            await exportTemplatesApi.remove(deleting.id);
            setDeleting(null);
            await templates.reload();
          }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

export default ExportTemplatesWidget;
