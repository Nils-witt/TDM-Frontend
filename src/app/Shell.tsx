import ResourceProvider from '@/api/ResourceProvider';
import WidgetWindows from '@/components/widgetWindow/WidgetWindows';
import Nav from '@/nav/Nav';
import Dashboard from '@/pages/dashboard/Dashboard';
import DashboardProvider from '@/pages/dashboard/DashboardProvider';
import LayoutProvider from '@/pages/dashboard/LayoutProvider';

function Shell() {
  return (
    <ResourceProvider>
      <LayoutProvider>
        <DashboardProvider>
          <WidgetWindows>
            <Nav />
            <Dashboard />
          </WidgetWindows>
        </DashboardProvider>
      </LayoutProvider>
    </ResourceProvider>
  );
}

export default Shell;
