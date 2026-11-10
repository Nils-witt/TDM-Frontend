import EventsProvider from '@/api/EventsProvider';
import ResourceProvider from '@/api/ResourceProvider';
import { useSession } from '@/app/session';
import OfflineBanner from '@/components/OfflineBanner';
import WidgetWindows from '@/components/widgetWindow/WidgetWindows';
import DataProvider from '@/data/DataProvider';
import SelectedMissionProvider from '@/data/SelectedMissionProvider';
import Nav from '@/nav/Nav';
import Dashboard from '@/pages/dashboard/Dashboard';
import DashboardProvider from '@/pages/dashboard/DashboardProvider';
import LayoutProvider from '@/pages/dashboard/LayoutProvider';

function Shell() {
  const { mode } = useSession();
  return (
    <ResourceProvider>
      <EventsProvider mode={mode}>
        <DataProvider>
          <LayoutProvider>
            <DashboardProvider>
              <SelectedMissionProvider>
                <WidgetWindows>
                  <Nav />
                  <Dashboard />
                  <OfflineBanner floating />
                </WidgetWindows>
              </SelectedMissionProvider>
            </DashboardProvider>
          </LayoutProvider>
        </DataProvider>
      </EventsProvider>
    </ResourceProvider>
  );
}

export default Shell;
