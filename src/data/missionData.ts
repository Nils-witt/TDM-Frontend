import { useMemo } from 'react';
import type { Collection } from '@/api/collection';
import { useOffline } from '@/api/connectivity';
import type { LogEntry, LogFile } from '@/api/logbook';
import type { MissionUnit } from '@/api/missionUnits';
import type { Mission } from '@/api/missions';
import { scopeKey, useTable } from '@/api/replica';
import type { Task } from '@/api/tasks';
import { useMission } from './missionsContext';

// What the API keeps per mission. Without a mission the collections are empty.
export type MissionData = {
  mission: Mission | null;
  // Closed is final: the mission, its log and its tasks can no longer change.
  // Offline nothing can be changed.
  readOnly: boolean;
  logEntries: Collection<LogEntry>;
  logFiles: Collection<LogFile>;
  tasks: Collection<Task>;
  // Released ones included.
  units: Collection<MissionUnit>;
};

// For a widget showing a mission of its own, not the selected one. The data is
// cached per mission, so every widget showing one mission shares the requests.
// An ID that is not a mission counts as none. A closed mission loads the
// closed ones (missionsContext.ts); the data of one closed long ago is kept
// in memory only.
export function useMissionData(missionId: string | null): MissionData {
  const { mission, transient } = useMission(missionId);
  const id = mission?.id ?? null;
  const opts = { transient };

  const logEntries = useTable<LogEntry>(id && scopeKey('log_entries', id, opts));
  const logFiles = useTable<LogFile>(id && scopeKey('log_files', id, opts));
  const tasks = useTable<Task>(id && scopeKey('tasks', id, opts));
  const units = useTable<MissionUnit>(id && scopeKey('mission_units', id, opts));

  const offline = useOffline();
  const readOnly = mission?.status === 'closed' || offline;

  return useMemo(
    () => ({ mission, readOnly, logEntries, logFiles, tasks, units }),
    [mission, readOnly, logEntries, logFiles, tasks, units],
  );
}
