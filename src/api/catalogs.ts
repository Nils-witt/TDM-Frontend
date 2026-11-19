import type { EntityMeta } from './entity';
import { request } from './client';
import { listFetcher } from './list';

// Names are unique (case-insensitive) among the active entries of a catalog.
export type CatalogEntry = EntityMeta & { id: string; name: string };

export type MissionTypeGroup = CatalogEntry;
export type LogbookType = CatalogEntry;
export type FileType = CatalogEntry;
// A mission scope (not a layout's scope). A mission without one is in the
// implicit Default scope, which has no entry (its chat flag is
// global_chat_enabled of api/messageSettings.ts). chat_enabled is absent
// from an API older than the chat and from rows replicated before it: off.
export type MissionScope = CatalogEntry & { chat_enabled?: boolean };

// Unique by name within its group only. description tells when to pick it;
// transport_request offers it to UHS functions for transport requests. Rows
// replicated before the API had them lack them.
export type MissionType = CatalogEntry & {
  group_id: string;
  description?: string;
  transport_request?: boolean;
};

export const missionTypeGroupsPath = '/api/v1/mission-type-groups';
export const missionTypesPath = '/api/v1/mission-types';
export const logbookTypesPath = '/api/v1/logbook-types';
export const fileTypesPath = '/api/v1/file-types';
export const scopesPath = '/api/v1/scopes';

export const fetchMissionTypeGroups = listFetcher<MissionTypeGroup>('mission_type_groups');
export const fetchMissionTypes = listFetcher<MissionType>('mission_types');
export const fetchLogbookTypes = listFetcher<LogbookType>('logbook_types');
export const fetchFileTypes = listFetcher<FileType>('file_types');
export const fetchScopes = listFetcher<MissionScope>('scopes');

// What a create sends; group_id, description and transport_request are for
// mission types only, chat_enabled for scopes only.
export type CatalogInput = {
  name: string;
  chat_enabled?: boolean;
  group_id?: string;
  description?: string;
  transport_request?: boolean;
};

// The writes need the admin group. Delete is soft: what refers to an entry
// keeps it, but it is no longer listed or offered.
export type CatalogApi<T extends CatalogEntry> = {
  create: (input: CatalogInput) => Promise<T>;
  patch: (id: string, input: Partial<CatalogInput>) => Promise<T>;
  remove: (id: string) => Promise<void>;
};

const catalogApi = <T extends CatalogEntry>(path: string): CatalogApi<T> => ({
  create: (input) => request<T>(path, { method: 'POST', body: JSON.stringify(input) }),
  patch: (id, input) =>
    request<T>(`${path}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  remove: (id) => request<void>(`${path}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
});

export const missionTypeGroupsApi = catalogApi<MissionTypeGroup>(missionTypeGroupsPath);
export const missionTypesApi = catalogApi<MissionType>(missionTypesPath);
export const logbookTypesApi = catalogApi<LogbookType>(logbookTypesPath);
export const fileTypesApi = catalogApi<FileType>(fileTypesPath);
export const scopesApi = catalogApi<MissionScope>(scopesPath);
