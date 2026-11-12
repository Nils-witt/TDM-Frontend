import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import EventsProvider from '@/api/EventsProvider';
import ResourceProvider from '@/api/ResourceProvider';
import { useSession } from '@/app/session';
import DataProvider from '@/data/DataProvider';
import Spinner from '@/components/Spinner';
import AppFrame from './AppFrame';
import ArchivePage from './pages/ArchivePage';
import MissionPage from './pages/MissionPage';
import MissionsPage from './pages/MissionsPage';
import NewMissionPage from './pages/NewMissionPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
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
  return (
    <Suspense fallback={<Spinner />}>
      <ThemeScope>
        <ResourceProvider>
          <EventsProvider mode={mode}>
            <DataProvider>
              <WidgetSheets>
                <Routes>
                  <Route element={<AppFrame />}>
                    <Route index element={<Navigate to="missions" replace />} />
                    <Route path="missions" element={<MissionsPage />} />
                    {/* Ranked above missions/:id, as a static segment wins. */}
                    <Route path="missions/new" element={<NewMissionPage />} />
                    <Route path="missions/:id" element={<MissionPage />} />
                    <Route path="archive" element={<ArchivePage />} />
                    <Route path="reports" element={<ReportsPage />} />
                    <Route
                      path="map"
                      element={
                        <Suspense fallback={<Spinner />}>
                          <MapPage />
                        </Suspense>
                      }
                    />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="*" element={<Navigate to="missions" replace />} />
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
