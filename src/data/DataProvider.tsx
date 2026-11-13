import type { ReactNode } from 'react';
import CatalogProvider from './CatalogProvider';
import MissionsProvider from './MissionsProvider';
import OfflinePrefetch from './OfflinePrefetch';
import SelectedScopeProvider from './SelectedScopeProvider';

// The API data every page may need, independent of the dashboard.
function DataProvider({ children }: { children: ReactNode }) {
  return (
    <CatalogProvider>
      <SelectedScopeProvider>
        <MissionsProvider>
          <OfflinePrefetch />
          {children}
        </MissionsProvider>
      </SelectedScopeProvider>
    </CatalogProvider>
  );
}

export default DataProvider;
