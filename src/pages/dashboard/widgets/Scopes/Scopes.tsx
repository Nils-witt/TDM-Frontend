import { scopesApi } from '@/api/catalogs';
import { useCatalogs } from '@/data/catalogContext';
import CatalogManager from '../shared/CatalogManager';

// Mission scopes; Global is implicit and not listed.
function ScopesWidget() {
  return (
    <CatalogManager
      noun="scope"
      heading="Scopes"
      entityType="scopes"
      collection={useCatalogs().scopes}
      api={scopesApi}
      deleteNote="Missions in it keep it, but it is no longer offered for new missions; tabs that selected it switch to Global."
    />
  );
}

export default ScopesWidget;
