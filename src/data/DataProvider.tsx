import type { ReactNode } from 'react';
import CatalogProvider from './CatalogProvider';
import MissionsProvider from './MissionsProvider';

// The API data every page may need, independent of the dashboard.
function DataProvider({ children }: { children: ReactNode }) {
  return (
    <CatalogProvider>
      <MissionsProvider>{children}</MissionsProvider>
    </CatalogProvider>
  );
}

export default DataProvider;
