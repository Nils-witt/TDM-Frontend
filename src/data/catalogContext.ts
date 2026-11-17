import { createContext, use } from 'react';
import type {
  FileType,
  LogbookType,
  MissionScope,
  MissionType,
  MissionTypeGroup,
} from '@/api/catalogs';
import type { Collection } from '@/api/collection';
import type { Uhs } from '@/api/uhs';

// The catalogs that missions, log entries and files refer to by ID.
export type Catalogs = {
  missionTypeGroups: Collection<MissionTypeGroup>;
  missionTypes: Collection<MissionType>;
  logbookTypes: Collection<LogbookType>;
  fileTypes: Collection<FileType>;
  scopes: Collection<MissionScope>;
  // The session scope's UHS, inactive ones included.
  uhs: Collection<Uhs>;
};

export const CatalogContext = createContext<Catalogs | null>(null);

export function useCatalogs(): Catalogs {
  const v = use(CatalogContext);
  if (!v) throw new Error('useCatalogs outside of CatalogProvider');
  return v;
}
