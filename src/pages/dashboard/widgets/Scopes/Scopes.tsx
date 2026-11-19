import { scopesApi } from '@/api/catalogs';
import { useCatalogs } from '@/data/catalogContext';
import CatalogManager from '../shared/CatalogManager';

// Mission scopes, each with its chat flag; Default is implicit and not
// listed (its chat flag is in Message Settings).
function ScopesWidget() {
  return (
    <CatalogManager
      noun="scope"
      heading="Scopes"
      entityType="scopes"
      collection={useCatalogs().scopes}
      api={scopesApi}
      chat
      deleteNote="Missions in it keep it, but it is no longer offered for new missions; tabs that selected it switch to Default."
    />
  );
}

export default ScopesWidget;
