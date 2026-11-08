import ResourceProvider from '@/api/ResourceProvider';
import WidgetWindows from '@/components/widgetWindow/WidgetWindows';
import DataProvider from '@/data/DataProvider';
import SelectedMissionProvider from '@/data/SelectedMissionProvider';
import Nav from '@/nav/Nav';
import Dashboard from '@/pages/dashboard/Dashboard';
import DashboardProvider from '@/pages/dashboard/DashboardProvider';
import LayoutProvider from '@/pages/dashboard/LayoutProvider';

function Shell() {
  return (
    <ResourceProvider>
      <DataProvider>
        <LayoutProvider>
          <DashboardProvider>
            <SelectedMissionProvider>
              <WidgetWindows>
                <Nav />
                <Dashboard />
              </WidgetWindows>
            </SelectedMissionProvider>
          </DashboardProvider>
        </LayoutProvider>
      </DataProvider>
    </ResourceProvider>
  );
}

export default Shell;
