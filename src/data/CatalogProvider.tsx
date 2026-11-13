import { type ReactNode, useMemo } from 'react';
import type {
  FileType,
  LogbookType,
  MissionScope,
  MissionType,
  MissionTypeGroup,
} from '@/api/catalogs';
import { scopeKey, useTable } from '@/api/replica';
import { CatalogContext } from './catalogContext';

// Loaded once at sign-in: they change rarely, and only through the admin group.
function CatalogProvider({ children }: { children: ReactNode }) {
  const missionTypeGroups = useTable<MissionTypeGroup>(scopeKey('mission_type_groups'));
  const missionTypes = useTable<MissionType>(scopeKey('mission_types'));
  const logbookTypes = useTable<LogbookType>(scopeKey('logbook_types'));
  const fileTypes = useTable<FileType>(scopeKey('file_types'));
  const scopes = useTable<MissionScope>(scopeKey('scopes'));

  const value = useMemo(
    () => ({ missionTypeGroups, missionTypes, logbookTypes, fileTypes, scopes }),
    [missionTypeGroups, missionTypes, logbookTypes, fileTypes, scopes],
  );

  return <CatalogContext value={value}>{children}</CatalogContext>;
}

export default CatalogProvider;
