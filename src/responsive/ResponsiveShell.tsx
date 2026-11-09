import { Navigate, Route, Routes } from 'react-router';
import EventsProvider from '@/api/EventsProvider';
import ResourceProvider from '@/api/ResourceProvider';
import { useSession } from '@/app/session';
import DataProvider from '@/data/DataProvider';
import AppFrame from './AppFrame';
import MissionPage from './pages/MissionPage';
import MissionsPage from './pages/MissionsPage';

// Shares only the data layer with the desktop Shell: no dashboard, layouts,
// widgets or selection. Routes are relative to the /m mount in App.tsx.
function ResponsiveShell() {
  const { mode } = useSession();
  return (
    <ResourceProvider>
      <EventsProvider mode={mode}>
        <DataProvider>
          <Routes>
            <Route element={<AppFrame />}>
              <Route index element={<Navigate to="missions" replace />} />
              <Route path="missions" element={<MissionsPage />} />
              <Route path="missions/:id" element={<MissionPage />} />
              <Route path="*" element={<Navigate to="missions" replace />} />
            </Route>
          </Routes>
        </DataProvider>
      </EventsProvider>
    </ResourceProvider>
  );
}

export default ResponsiveShell;
