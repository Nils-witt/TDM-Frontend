import { useMemo } from 'react';
import type { Collection } from '@/api/collection';
import { useOffline } from '@/api/connectivity';
import type { LogEntry, LogFile } from '@/api/logbook';
import type { Mission } from '@/api/missions';
import { scopeKey, useTable } from '@/api/replica';
import type { Task } from '@/api/tasks';
import { useMissions } from './missionsContext';

// What the API keeps per mission. Without a mission the collections are empty.
export type MissionData = {
  mission: Mission | null;
  // Closed is final: the mission, its log and its tasks can no longer change.
  // Offline nothing can be changed.
  readOnly: boolean;
  logEntries: Collection<LogEntry>;
  logFiles: Collection<LogFile>;
  tasks: Collection<Task>;
};

// For a widget showing a mission of its own, not the selected one. The data is
// cached per mission, so every widget showing one mission shares the requests.
// An ID that is not an active mission counts as none.
export function useMissionData(missionId: string | null): MissionData {
  const { byId } = useMissions();
  const mission = (missionId !== null && byId.get(missionId)) || null;
  const id = mission?.id ?? null;

  const logEntries = useTable<LogEntry>(id && scopeKey('log_entries', id));
  const logFiles = useTable<LogFile>(id && scopeKey('log_files', id));
  const tasks = useTable<Task>(id && scopeKey('tasks', id));

  const offline = useOffline();
  const readOnly = mission?.status === 'closed' || offline;

  return useMemo(
    () => ({ mission, readOnly, logEntries, logFiles, tasks }),
    [mission, readOnly, logEntries, logFiles, tasks],
  );
}
