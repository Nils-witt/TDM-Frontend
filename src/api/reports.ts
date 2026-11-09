import { useCollection } from './collection';
import { request } from './client';
import type { EntityMeta, Timestamp } from './entity';
import { listFetcher } from './list';

export type Signature = {
  // A user's ID (users.id), null for an external signer.
  user_id: string | null;
  // Empty for a user.
  name: string;
  signed_at: Timestamp;
};

// Uploaded once, with the signatures.
export type ReportSigning = {
  size: number;
  signatures: Signature[];
  note: string;
  // Username.
  uploaded_by: string;
  uploaded_at: Timestamp;
};

// The PDF an export template rendered of a done or closed mission, and the data
// it was rendered from. Admins see every report, anyone else those they
// created, sign as a user, or that are shared with them or one of their
// groups. The creator or an admin uploads the signed PDF, once, and changes
// the shares. Reports are never deleted. created_by is the creator's username.
export type Report = EntityMeta & {
  id: string;
  mission: string;
  template: string;
  pdf_size: number;
  // null until uploaded.
  signed: ReportSigning | null;
  // User IDs (users.id) and group names (as in whoami's groups) that may read
  // the report and its PDFs, but not sign or share it.
  shared_users: string[];
  shared_groups: string[];
  // Only a single report carries the data it was rendered from.
  data?: unknown;
};

export type ReportFilter = { missionId?: string; signed?: boolean };

const reportsPath = '/api/v1/reports';
const reportPath = (id: string) => `${reportsPath}/${encodeURIComponent(id)}`;

export function reportsPathFor(f: ReportFilter): string {
  const q = new URLSearchParams();
  if (f.missionId) q.set('mission', f.missionId);
  if (f.signed !== undefined) q.set('signed', String(f.signed));
  const s = q.toString();
  return s ? `${reportsPath}?${s}` : reportsPath;
}

const fetchReports = listFetcher<Report>('reports');

// Newest first. Nothing reloads them by itself: call reload() after a write.
export const useReports = (f: ReportFilter) => useCollection(reportsPathFor(f), fetchReports);

// user_id or name, not both.
export type SignatureInput = { user_id?: string; name?: string; signed_at: string };

export const reportsApi = {
  // Rejected (409) unless the mission is done or closed.
  create: (missionId: string, templateId: string) =>
    request<Report>(reportsPath, {
      method: 'POST',
      body: JSON.stringify({ mission: missionId, template: templateId }),
    }),
  // Once.
  sign: (id: string, file: File, signatures: SignatureInput[], note: string) => {
    const body = new FormData();
    body.append('signing', JSON.stringify({ signatures, note }));
    body.append('file', file);
    return request<Report>(`${reportPath(id)}/signed`, { method: 'POST', body });
  },
  // Replaces both lists; users added must be enabled.
  share: (id: string, users: string[], groups: string[]) =>
    request<Report>(`${reportPath(id)}/shares`, {
      method: 'PUT',
      body: JSON.stringify({ users, groups }),
    }),
};

// The PDFs need the token, so they are loaded with requestBlob (see PdfViewer).
export const reportPdfPath = (id: string, signed = false) =>
  `${reportPath(id)}/${signed ? 'signed-pdf' : 'pdf'}`;
