import { useCollection } from './collection';
import { request, requestBlob } from './client';
import type { EntityMeta } from './entity';
import { listFetcher } from './list';

// The source is a pongo2 (Jinja-like) template rendering the body of an HTML
// page, which the API converts to PDF. Admins write templates; every user
// makes intermediate and final reports with them. is_intermediate tells a
// template which one it renders.
export type ExportTemplate = EntityMeta & {
  id: string;
  name: string;
  source: string;
};

export type ExportTemplateInput = Pick<ExportTemplate, 'name' | 'source'>;

export const exportTemplatesPath = '/api/v1/export-templates';

const fetchExportTemplates = listFetcher<ExportTemplate>('export_templates');

// Shared through the resource cache, so the admin widget's reload after a write
// updates every template picker.
export const useExportTemplates = () => useCollection(exportTemplatesPath, fetchExportTemplates);

const templatePath = (id: string) => `${exportTemplatesPath}/${encodeURIComponent(id)}`;

// The writes and the preview need the admin group. A source that does not
// compile is rejected, naming its line.
export const exportTemplatesApi = {
  create: (t: ExportTemplateInput) =>
    request<ExportTemplate>(exportTemplatesPath, { method: 'POST', body: JSON.stringify(t) }),
  patch: (id: string, t: Partial<ExportTemplateInput>) =>
    request<ExportTemplate>(templatePath(id), { method: 'PATCH', body: JSON.stringify(t) }),
  remove: (id: string) => request<void>(templatePath(id), { method: 'DELETE' }),
  // Renders the unsaved source as the page an export converts to PDF, with the
  // watermark if intermediate.
  preview: (missionId: string, source: string, intermediate: boolean) =>
    request<{ html: string }>(`${exportTemplatesPath}/preview`, {
      method: 'POST',
      body: JSON.stringify({ mission: missionId, source, is_intermediate: intermediate }),
    }).then((r) => r.html),
};

// A watermarked PDF of a mission in any status. It is not stored, but every
// call is recorded in the mission's audit log, so call it once per request of
// the user, never from an effect that may run again.
export const intermediateReport = (missionId: string, templateId: string) =>
  requestBlob(`/api/v1/missions/${encodeURIComponent(missionId)}/intermediate-report`, undefined, {
    method: 'POST',
    body: JSON.stringify({ template: templateId }),
  });
