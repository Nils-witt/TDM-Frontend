import { Navigate, Route, Routes } from 'react-router';
import EventsProvider from '@/api/EventsProvider';
import ResourceProvider from '@/api/ResourceProvider';
import { useSession } from '@/app/session';
import DataProvider from '@/data/DataProvider';
import SelectedMissionProvider from '@/data/SelectedMissionProvider';
import AboutProvider from '@/nav/AboutProvider';
import MissionCloseProvider from '@/nav/MissionCloseProvider';
import MissionPrintProvider from '@/nav/MissionPrintProvider';
import MissionScreen from './MissionScreen';
import MissionsScreen from './MissionsScreen';
import MobileDashboardProvider from './MobileDashboardProvider';
import MobileLayout from './MobileLayout';
import MobileSheets from './MobileSheets';
import MoreScreen from './MoreScreen';
import WidgetScreen from './WidgetScreen';

// The phone UI: the dashboard's widgets one at a time, without layouts,
// channels or admin functions. Its own DashboardContext and
// WidgetWindowContext let the widgets run unchanged.
function MobileShell() {
  const { mode } = useSession();
  return (
    <ResourceProvider>
      <EventsProvider mode={mode}>
        <DataProvider>
          <MobileDashboardProvider>
            <SelectedMissionProvider>
              <MobileSheets>
                <MissionCloseProvider>
                  <MissionPrintProvider>
                    <AboutProvider>
                      <Routes>
                        <Route element={<MobileLayout />}>
                          <Route index element={<Navigate to="missions" replace />} />
                          <Route path="missions" element={<MissionsScreen />} />
                          <Route path="missions/:missionId" element={<MissionScreen />} />
                          <Route path="logbook" element={<WidgetScreen widgetId="Logbook" />} />
                          <Route path="files" element={<WidgetScreen widgetId="FileList" />} />
                          <Route path="map" element={<WidgetScreen widgetId="Map" />} />
                          <Route path="more" element={<MoreScreen />} />
                          <Route path="*" element={<Navigate to="missions" replace />} />
                        </Route>
                      </Routes>
                    </AboutProvider>
                  </MissionPrintProvider>
                </MissionCloseProvider>
              </MobileSheets>
            </SelectedMissionProvider>
          </MobileDashboardProvider>
        </DataProvider>
      </EventsProvider>
    </ResourceProvider>
  );
}

export default MobileShell;
