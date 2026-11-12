import { request } from './client';
import type { EntityMeta, Revocation } from './entity';
import { listFetcher } from './list';

export type LogEntry = EntityMeta &
  Revocation & {
    id: string;
    mission: string;
    // Null for free text.
    type_id: string | null;
    text: string;
    sender: string;
    receiver: string;
  };

export type LogFile = EntityMeta &
  Revocation & {
    id: string;
    mission: string;
    entry: string;
    name: string;
    // An optional text rendering, e.g. a transcript.
    content_text: string;
    type: string;
    media_type: string;
    size: number;
    // Lowercase hex SHA-256 of the content.
    digest: string;
    // Pinned to the mission for every user; null (or absent in rows stored
    // before pins existed) when not pinned.
    pinned_at?: string | null;
    pinned_by?: string | null;
  };

export const isPinned = (f: LogFile) => f.pinned_at != null;

// Revoked items are left out.
export const logEntriesPath = (missionId: string) =>
  `/api/v1/log-entries?mission=${encodeURIComponent(missionId)}`;
export const logFilesPath = (missionId: string) =>
  `/api/v1/log-files?mission=${encodeURIComponent(missionId)}`;

export const fetchLogEntries = listFetcher<LogEntry>('log_entries');
export const fetchLogFiles = listFetcher<LogFile>('log_files');

// The API's default MAX_UPLOAD_BYTES, which limits the whole request body.
export const maxUploadBytes = 50 << 20;

export const fileContentPath = (id: string) =>
  `/api/v1/log-files/${encodeURIComponent(id)}/content`;

export type LogEntryCreate = {
  mission: string;
  type_id: string | null;
  text: string;
  sender: string;
  receiver: string;
};

export type LogFileCreate = { file: File; type: string; name: string; content_text: string };

// JSON without files. With them, multipart: the entry part lists the files,
// matched in order to one files part each.
export function createLogEntry(entry: LogEntryCreate, files: LogFileCreate[]) {
  let body: string | FormData;
  if (files.length === 0) {
    body = JSON.stringify(entry);
  } else {
    body = new FormData();
    const described = {
      ...entry,
      files: files.map(({ type, name, content_text }) => ({ type, name, content_text })),
    };
    body.append('entry', JSON.stringify(described));
    for (const f of files) body.append('files', f.file, f.name);
  }
  return request<{ entry: LogEntry; files: LogFile[] }>('/api/v1/log-entries', {
    method: 'POST',
    body,
  });
}

// Revokes the entry's files too. The API requires a reason.
export const revokeLogEntry = (id: string, reason: string) =>
  request<LogEntry>(`/api/v1/log-entries/${encodeURIComponent(id)}/revoke`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });

// A pin is shared by every user of the mission. The mission must not be
// closed.
export const pinLogFile = (id: string, pinned: boolean) =>
  request<LogFile>(`/api/v1/log-files/${encodeURIComponent(id)}/pin`, {
    method: pinned ? 'PUT' : 'DELETE',
  });
