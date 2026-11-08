import { useMemo } from 'react';
import { type Collection, useCollection } from '@/api/collection';
import {
  fetchLogEntries,
  fetchLogFiles,
  type LogEntry,
  type LogFile,
  logEntriesPath,
  logFilesPath,
} from '@/api/logbook';
import type { Mission } from '@/api/missions';
import { fetchTasks, type Task, tasksPath } from '@/api/tasks';
import { useMissions } from './missionsContext';

// What the API keeps per mission. Without a mission the collections are empty.
export type MissionData = {
  mission: Mission | null;
  // Closed is final: the mission, its log and its tasks can no longer change.
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

  const logEntries = useCollection(id && logEntriesPath(id), fetchLogEntries);
  const logFiles = useCollection(id && logFilesPath(id), fetchLogFiles);
  const tasks = useCollection(id && tasksPath(id), fetchTasks);

  const readOnly = mission?.status === 'closed';

  return useMemo(
    () => ({ mission, readOnly, logEntries, logFiles, tasks }),
    [mission, readOnly, logEntries, logFiles, tasks],
  );
}
