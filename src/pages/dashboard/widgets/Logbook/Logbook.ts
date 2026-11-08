import { useCallback, useMemo, useState } from 'react';
import { type LogEntry, revokeLogEntry } from '@/api/logbook';
import { useWidgetWindows } from '@/components/widgetWindow/widgetWindowContext';
import { useSelectedMission } from '@/data/selectedMissionContext';
import { filesByEntry, matchesType, partiesMatcher } from '../shared/logbookEntries';
import type { DefaultFilters } from '../shared/logbookFilterOptions';

export function useLogbookWidget(defaults: DefaultFilters) {
  const { mission, readOnly, logEntries, logFiles } = useSelectedMission();
  const { openWidget } = useWidgetWindows();
  const [filter, setFilter] = useState(defaults.parties);
  const [typeFilter, setTypeFilter] = useState(defaults.types);
  const [showFilters, setShowFilters] = useState(false);
  const [ownError, setError] = useState<string | null>(null);
  const error = ownError ?? logEntries.error ?? logFiles.error;
  const files = useMemo(() => filesByEntry(logFiles.items), [logFiles.items]);

  // confirmRevoke rejects so the revoke dialog shows the error. The API revokes
  // the entry's files with it.
  const [revoking, setRevoking] = useState<LogEntry | null>(null);
  const revoke = useCallback((entry: LogEntry) => setRevoking(entry), []);
  const cancelRevoke = useCallback(() => setRevoking(null), []);
  const reloadEntries = logEntries.reload;
  const reloadFiles = logFiles.reload;
  const confirmRevoke = useCallback(
    async (reason: string) => {
      if (revoking === null) return;
      await revokeLogEntry(revoking.id, reason);
      setRevoking(null);
      setError(null);
      await Promise.all([reloadEntries(), reloadFiles()]);
    },
    [revoking, reloadEntries, reloadFiles],
  );

  const shown = useMemo(() => {
    const parties = partiesMatcher(filter);
    return logEntries.items.filter((e) => matchesType(e, typeFilter) && parties(e));
  }, [logEntries.items, typeFilter, filter]);

  const activeFilters = [typeFilter.size > 0, filter.sender !== '', filter.receiver !== ''].filter(
    Boolean,
  ).length;

  return {
    mission,
    entries: logEntries.items,
    loading: logEntries.loading,
    shown,
    files,
    error,
    setError,
    readOnly,
    revoke,
    revokeSubject: revoking?.text ?? null,
    confirmRevoke,
    cancelRevoke,
    openForm: () => openWidget('LogbookForm'),
    filter,
    setFilter,
    typeFilter,
    setTypeFilter,
    showFilters,
    toggleFilters: () => setShowFilters((v) => !v),
    activeFilters,
  };
}
