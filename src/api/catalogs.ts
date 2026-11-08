import type { EntityMeta } from './entity';
import { listFetcher } from './list';

// Names are unique (case-insensitive) among the active entries of a catalog.
export type CatalogEntry = EntityMeta & { id: string; name: string };

export type MissionTypeGroup = CatalogEntry;
export type LogbookType = CatalogEntry;
export type FileType = CatalogEntry;

// Unique by name within its group only.
export type MissionType = CatalogEntry & { group_id: string };

export const missionTypeGroupsPath = '/api/v1/mission-type-groups';
export const missionTypesPath = '/api/v1/mission-types';
export const logbookTypesPath = '/api/v1/logbook-types';
export const fileTypesPath = '/api/v1/file-types';

export const fetchMissionTypeGroups = listFetcher<MissionTypeGroup>('mission_type_groups');
export const fetchMissionTypes = listFetcher<MissionType>('mission_types');
export const fetchLogbookTypes = listFetcher<LogbookType>('logbook_types');
export const fetchFileTypes = listFetcher<FileType>('file_types');
