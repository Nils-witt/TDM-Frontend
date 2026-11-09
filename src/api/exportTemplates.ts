import { useCollection } from './collection';
import { request } from './client';
import type { EntityMeta } from './entity';
import { listFetcher } from './list';

// The source is a pongo2 (Jinja-like) template rendering the body of an HTML
// page, which the API converts to PDF. Admins write templates; every user
// prints missions and makes reports with them.
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
  // Renders the unsaved source as the page an export converts to PDF.
  preview: (missionId: string, source: string) =>
    request<{ html: string }>(`${exportTemplatesPath}/preview`, {
      method: 'POST',
      body: JSON.stringify({ mission: missionId, source }),
    }).then((r) => r.html),
};

// The PDF needs the token, so it is loaded with requestBlob (see PdfViewer).
export const missionExportPath = (missionId: string, templateId: string) =>
  `/api/v1/missions/${encodeURIComponent(missionId)}/export?template=${encodeURIComponent(templateId)}`;
