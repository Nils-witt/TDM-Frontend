import type { EntityMeta, Timestamp } from './entity';
import { listFetcher } from './list';

// Tasks are never deleted, only archived.
export type Task = EntityMeta & {
  id: string;
  mission: string;
  name: string;
  description: string;
  scheduled_at: Timestamp | null;
  done_at: Timestamp | null;
  // Empty while not done.
  done_by: string;
  archived_at: Timestamp | null;
  // Empty while not archived.
  archived_by: string;
};

// Archived tasks included.
export const tasksPath = (missionId: string) =>
  `/api/v1/tasks?mission=${encodeURIComponent(missionId)}`;

export const fetchTasks = listFetcher<Task>('tasks');
