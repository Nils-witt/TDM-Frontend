import { createContext, use } from 'react';

// GET /api/v1/events: a WebSocket on which the API announces which entity
// types (its table names) changed. It never sends the entities, so the
// resource cache reloads what is shown, with the caller's permissions.
export const eventsPath = '/api/v1/events';

export type ServerEvent =
  | { type: 'ready' }
  | { type: 'changed'; types: string[] }
  // Changes may have been missed: reload everything.
  | { type: 'resync' };

// The API paths showing each entity type. Users and groups show each other's
// memberships.
const typePaths: Record<string, string[]> = {
  users: ['/api/v1/users', '/api/v1/groups'],
  groups: ['/api/v1/groups', '/api/v1/users'],
  user_groups: ['/api/v1/groups', '/api/v1/users'],
  group_permissions: ['/api/v1/groups'],
  mission_type_groups: ['/api/v1/mission-type-groups'],
  mission_types: ['/api/v1/mission-types'],
  logbook_types: ['/api/v1/logbook-types'],
  file_types: ['/api/v1/file-types'],
  missions: ['/api/v1/missions'],
  log_entries: ['/api/v1/log-entries'],
  log_files: ['/api/v1/log-files'],
  tasks: ['/api/v1/tasks'],
  map_styles: ['/api/v1/map-styles'],
  map_settings: ['/api/v1/map-settings'],
  dashboard_layouts: ['/api/v1/layouts'],
  user_preferences: ['/api/v1/me/preferences'],
  export_templates: ['/api/v1/export-templates'],
  reports: ['/api/v1/reports'],
  workflows: ['/api/v1/workflows'],
  backup_instances: ['/api/v1/backup-instances', '/api/v1/backup-status'],
};

// Every change is recorded there.
const alwaysChanged = ['/api/v1/audit-log'];

const under = (path: string, prefix: string) =>
  path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`);

export const everything = () => true;

// Which cached paths may show what changed. A type this version does not know
// (added to the API later) reloads everything.
export function changedPaths(types: string[]): (path: string) => boolean {
  const prefixes = [...alwaysChanged];
  for (const t of types) {
    const paths = typePaths[t];
    if (!paths) return everything;
    prefixes.push(...paths);
  }
  return (path) => prefixes.some((p) => under(path, p));
}

// live: the event stream is connected, so what is shown follows changes made
// elsewhere. Starts true, so nothing warns before the first attempt failed.
export type LiveState = { live: boolean };

export const LiveContext = createContext<LiveState | null>(null);

export function useLive(): LiveState {
  const state = use(LiveContext);
  if (!state) throw new Error('useLive outside of EventsProvider');
  return state;
}
