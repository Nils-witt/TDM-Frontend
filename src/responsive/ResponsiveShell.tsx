import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import EventsProvider from '@/api/EventsProvider';
import ResourceProvider from '@/api/ResourceProvider';
import { useAllowedViews, useSession } from '@/app/session';
import DataProvider from '@/data/DataProvider';
import Spinner from '@/components/Spinner';
import AppFrame from './AppFrame';
import { homePath } from './sections';
import ArchivePage from './pages/ArchivePage';
import MissionPage from './pages/MissionPage';
import MissionsPage from './pages/MissionsPage';
import NewMissionPage from './pages/NewMissionPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import UhsNewPatientPage from './pages/UhsNewPatientPage';
import UhsPage from './pages/UhsPage';
import UhsPatientPage from './pages/UhsPatientPage';
import UhsTransportPage from './pages/UhsTransportPage';
import WidgetSheets from './WidgetSheets';

// MapLibre is large; only the map tab loads it.
const MapPage = lazy(() => import('./pages/MapPage'));
const ThemeScope = lazy(() => import('./widgets/ThemeScope'));

// Shares the data layer and some widgets with the desktop Shell, but no
// dashboard, layouts or selection. WidgetSheets shows what widgets open in a
// window. Routes are relative to the /m mount in App.tsx. The MUI theme is for
// the widgets' MUI variants (widgets/); no CssBaseline, as the global styles
// already set the page up.
function ResponsiveShell() {
  const { mode } = useSession();
  // Only the pages of the session's user function are routed; a hidden one
  // leads to the first shown section. A mission's page stays reachable, as
  // the map and archive link to it.
  const { pages } = useAllowedViews();
  const home = homePath(pages);
  return (
    <Suspense fallback={<Spinner />}>
      <ThemeScope>
        <ResourceProvider>
          <EventsProvider mode={mode}>
            <DataProvider>
              <WidgetSheets>
                <Routes>
                  <Route element={<AppFrame />}>
                    <Route index element={<Navigate to={home} replace />} />
                    {pages.has('missions') && (
                      <>
                        <Route path="missions" element={<MissionsPage />} />
                        {/* Ranked above missions/:id, as a static segment wins. */}
                        <Route path="missions/new" element={<NewMissionPage />} />
                      </>
                    )}
                    {pages.has('uhs') && (
                      <>
                        <Route path="uhs" element={<UhsPage />} />
                        <Route path="uhs/new" element={<UhsNewPatientPage />} />
                        <Route path="uhs/patients/:id" element={<UhsPatientPage />} />
                        <Route path="uhs/patients/:id/transport" element={<UhsTransportPage />} />
                      </>
                    )}
                    <Route path="missions/:id" element={<MissionPage />} />
                    {pages.has('archive') && <Route path="archive" element={<ArchivePage />} />}
                    {pages.has('reports') && <Route path="reports" element={<ReportsPage />} />}
                    {pages.has('map') && (
                      <Route
                        path="map"
                        element={
                          <Suspense fallback={<Spinner />}>
                            <MapPage />
                          </Suspense>
                        }
                      />
                    )}
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="*" element={<Navigate to={home} replace />} />
                  </Route>
                </Routes>
              </WidgetSheets>
            </DataProvider>
          </EventsProvider>
        </ResourceProvider>
      </ThemeScope>
    </Suspense>
  );
}

export default ResponsiveShell;
