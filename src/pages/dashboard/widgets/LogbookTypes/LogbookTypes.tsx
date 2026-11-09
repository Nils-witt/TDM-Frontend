import { logbookTypesApi } from '@/api/catalogs';
import { useCatalogs } from '@/data/catalogContext';
import CatalogManager from '../shared/CatalogManager';

function LogbookTypesWidget() {
  return (
    <CatalogManager
      noun="logbook type"
      heading="Logbook types"
      entityType="logbook_types"
      collection={useCatalogs().logbookTypes}
      api={logbookTypesApi}
      deleteNote="Entries written with it keep it, but it is no longer offered for new entries."
    />
  );
}

export default LogbookTypesWidget;
