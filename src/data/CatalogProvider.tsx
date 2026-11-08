import { type ReactNode, useMemo } from 'react';
import {
  fetchFileTypes,
  fetchLogbookTypes,
  fetchMissionTypeGroups,
  fetchMissionTypes,
  fileTypesPath,
  logbookTypesPath,
  missionTypeGroupsPath,
  missionTypesPath,
} from '@/api/catalogs';
import { useCollection } from '@/api/collection';
import { CatalogContext } from './catalogContext';

// Loaded once at sign-in: they change rarely, and only through the admin group.
function CatalogProvider({ children }: { children: ReactNode }) {
  const missionTypeGroups = useCollection(missionTypeGroupsPath, fetchMissionTypeGroups);
  const missionTypes = useCollection(missionTypesPath, fetchMissionTypes);
  const logbookTypes = useCollection(logbookTypesPath, fetchLogbookTypes);
  const fileTypes = useCollection(fileTypesPath, fetchFileTypes);

  const value = useMemo(
    () => ({ missionTypeGroups, missionTypes, logbookTypes, fileTypes }),
    [missionTypeGroups, missionTypes, logbookTypes, fileTypes],
  );

  return <CatalogContext value={value}>{children}</CatalogContext>;
}

export default CatalogProvider;
