import { Navigate, Route, Routes } from 'react-router';
import EventsProvider from '@/api/EventsProvider';
import ResourceProvider from '@/api/ResourceProvider';
import { useSession } from '@/app/session';
import DataProvider from '@/data/DataProvider';
import AppFrame from './AppFrame';
import MissionPage from './pages/MissionPage';
import MissionsPage from './pages/MissionsPage';
import WidgetSheets from './WidgetSheets';

// Shares the data layer and some widgets with the desktop Shell, but no
// dashboard, layouts or selection. WidgetSheets shows what widgets open in a
// window. Routes are relative to the /m mount in App.tsx.
function ResponsiveShell() {
  const { mode } = useSession();
  return (
    <ResourceProvider>
      <EventsProvider mode={mode}>
        <DataProvider>
          <WidgetSheets>
            <Routes>
              <Route element={<AppFrame />}>
                <Route index element={<Navigate to="missions" replace />} />
                <Route path="missions" element={<MissionsPage />} />
                <Route path="missions/:id" element={<MissionPage />} />
                <Route path="*" element={<Navigate to="missions" replace />} />
              </Route>
            </Routes>
          </WidgetSheets>
        </DataProvider>
      </EventsProvider>
    </ResourceProvider>
  );
}

export default ResponsiveShell;
