import { fileTypesApi } from '@/api/catalogs';
import { useCatalogs } from '@/data/catalogContext';
import CatalogManager from '../shared/CatalogManager';

function FileTypesWidget() {
  return (
    <CatalogManager
      noun="file type"
      heading="File types"
      entityType="file_types"
      collection={useCatalogs().fileTypes}
      api={fileTypesApi}
      deleteNote="Files attached with it keep it, but it is no longer offered for new files."
    />
  );
}

export default FileTypesWidget;
