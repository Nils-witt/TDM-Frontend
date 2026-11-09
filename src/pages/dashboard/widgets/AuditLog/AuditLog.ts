import { useState } from 'react';
import { type AuditLog, auditLogPath } from '@/api/audit';
import { useResource } from '@/api/resource';

export const pageSize = 50;

export type AuditFilter = { entityType: string; entityId: string; actor: string };

// Pages are cached by path like any resource, so Newer shows the page it left
// at once; Refresh goes back to the newest page and loads it again.
export function useAuditLog(initial: AuditFilter) {
  const [filter, setFilterState] = useState(initial);
  // The before cursors of the pages older than the newest, oldest last.
  const [cursors, setCursors] = useState<string[]>([]);
  const before = cursors.at(-1);
  const path = auditLogPath({
    entity_type: filter.entityType,
    entity_id: filter.entityId,
    actor: filter.actor,
    before,
    limit: pageSize,
  });
  const { data, error, reload } = useResource<AuditLog>(path);

  const nextBefore = data?.next_before;
  return {
    filter,
    setFilter: (f: AuditFilter) => {
      setFilterState(f);
      setCursors([]);
    },
    page: data,
    loading: data === undefined && error === null,
    error,
    pageNumber: cursors.length + 1,
    newer: cursors.length > 0 ? () => setCursors(cursors.slice(0, -1)) : null,
    older: nextBefore ? () => setCursors([...cursors, nextBefore]) : null,
    refresh: () => {
      if (cursors.length === 0) void reload();
      else setCursors([]);
    },
    reload,
  };
}
