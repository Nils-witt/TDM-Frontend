import type { Timestamp } from './entity';

// The table names the API records changes for. user_groups entries are
// membership changes, with the user's ID as entity_id.
export const auditEntityTypes = [
  'users',
  'groups',
  'user_groups',
  'missions',
  'mission_type_groups',
  'mission_types',
  'logbook_types',
  'file_types',
  'log_entries',
  'log_files',
  'tasks',
  'map_styles',
] as const;

export type AuditEntityType = (typeof auditEntityTypes)[number];

export type AuditEntry = {
  id: string;
  occurred_at: Timestamp;
  // Username; `system` for the LDAP sync.
  actor: string;
  entity_type: string;
  entity_id: string;
  // Setting deleted_at is recorded as delete.
  action: 'create' | 'update' | 'delete';
  // old is null on create, new on delete.
  changes: Record<string, { old: unknown; new: unknown }>;
};

export type AuditLog = { entries: AuditEntry[]; next_before?: string };

// Empty values are left out.
export type AuditQuery = {
  entity_type?: string;
  entity_id?: string;
  actor?: string;
  // The cursor: entries older than this one.
  before?: string;
  limit?: number;
};

export function auditLogPath(q: AuditQuery): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined && v !== '') params.set(k, String(v));
  }
  const query = params.toString();
  return query ? `/api/v1/audit-log?${query}` : '/api/v1/audit-log';
}
