import { useIsAdmin } from '../app/session';
import { InfoIcon, LocationIcon } from '../components/icons';
import MenuBar from '../components/menu/MenuBar';
import MenuSeparator from '../components/menu/MenuSeparator';
import AboutProvider from './AboutProvider';
import MissionCloseProvider from './MissionCloseProvider';
import MissionPrintProvider from './MissionPrintProvider';
import NavShortcuts from './NavShortcuts';
import NavMenuItem from './NavMenuItem';
import TopLevelMenu from './TopLevelMenu';
import ViewMenu from './ViewMenu';
import AppTitle from './menus/AppTitle';
import ChannelIndicator from './actions/ChannelIndicator';
import Clock from './actions/Clock';
import LiveIndicator from './actions/LiveIndicator';
import BackupIndicator from './actions/BackupIndicator';
import UnitRequestIndicator from './actions/UnitRequestIndicator';
import Fullscreen from './actions/Fullscreen';
import ScopeMenu from './actions/ScopeMenu';
import UserMenu from './actions/UserMenu';
import styles from './Nav.module.scss';

// Styled like the macOS menu bar; each status indicator on the right keeps its
// own state. The menus follow missioncontroller's, without what universalGoApi
// lacks (units, nodes, roles, reopening). The Admin menu is shown to members of
// the API's admin group only.
function Nav() {
  const admin = useIsAdmin();
  return (
    <MissionCloseProvider>
      <MissionPrintProvider>
        <AboutProvider>
          <NavShortcuts />
          <MenuBar className={styles.bar}>
            <nav className={styles.left} aria-label="Main">
              <TopLevelMenu label="Universam menu" icon={<LocationIcon />}>
                <NavMenuItem label="About Universam" action="about" icon={<InfoIcon />} />
                <MenuSeparator />
                <NavMenuItem label="Reload" action="reload" keys="Mod+R" />
                <NavMenuItem label="Responsive View" action="mobileView" />
                <MenuSeparator />
                <NavMenuItem label="Log Out…" action="logout" />
              </TopLevelMenu>
              <AppTitle />
              <TopLevelMenu label="Missions">
                <NavMenuItem label="Save Mission" action="saveMission" shortcut="saveMission" />
                <NavMenuItem label="Clear Mission" action="clearMission" shortcut="clearMission" />
                <NavMenuItem label="Close Mission" action="closeMission" shortcut="closeMission" />
                <NavMenuItem
                  label="Intermediate Report…"
                  action="printMission"
                  shortcut="printMission"
                />
                <NavMenuItem label="Create Report…" action="createReport" />
                <NavMenuItem label="Reports" widget="Reports" />
                <MenuSeparator />
                <NavMenuItem label="Missions" widget="MissionsList" />
                <NavMenuItem label="Mission Archive" widget="MissionArchive" />
                <NavMenuItem label="Mission Details" widget="MissionDetails" />
                <NavMenuItem label="Active Missions" widget="ActiveMissions" />
                <NavMenuItem label="Map" widget="Map" />
              </TopLevelMenu>
              <TopLevelMenu label="Units">
                <NavMenuItem label="Unit Status" widget="UnitStatus" />
                <NavMenuItem label="Unit Requests" widget="UnitRequests" />
                <NavMenuItem label="Unit Scopes" widget="UnitScopes" />
                <MenuSeparator />
                <NavMenuItem label="Units in Mission" widget="MissionUnits" />
                <NavMenuItem label="Add Unit…" widget="AddUnit" />
              </TopLevelMenu>
              <TopLevelMenu label="Logbook">
                <NavMenuItem label="New Entry" widget="LogbookForm" shortcut="newLogEntry" />
                <NavMenuItem label="Logbook" widget="Logbook" />
                <NavMenuItem label="Files" widget="FileList" />
              </TopLevelMenu>
              {admin && (
                <TopLevelMenu label="Admin">
                  <NavMenuItem label="Mission Types" widget="MissionTypes" />
                  <NavMenuItem label="Logbook Types" widget="LogbookTypes" />
                  <NavMenuItem label="File Types" widget="FileTypes" />
                  <NavMenuItem label="Scopes" widget="Scopes" />
                  <NavMenuItem label="Map Defaults" widget="MapAdmin" />
                  <NavMenuItem label="Map Styles" widget="MapStyles" />
                  <NavMenuItem label="Export Templates" widget="ExportTemplates" />
                  <NavMenuItem label="Workflows" widget="Workflows" />
                  <NavMenuItem label="Backup Servers" widget="BackupInstances" />
                  <NavMenuItem label="Backup Status" widget="BackupStatus" />
                  <NavMenuItem label="Layouts" widget="Layouts" />
                  <NavMenuItem label="Import / Export…" widget="ConfigTransfer" />
                  <MenuSeparator />
                  <NavMenuItem label="Users" widget="Users" />
                  <NavMenuItem label="Groups" widget="Groups" />
                  <NavMenuItem label="Permissions" widget="Permissions" />
                  <NavMenuItem label="Audit Log" widget="AuditLog" />
                </TopLevelMenu>
              )}
              <ViewMenu />
              <TopLevelMenu label="Help">
                <NavMenuItem label="Source Code" href="https://github.com/Nils-witt/TDM-Frontend" />
              </TopLevelMenu>
            </nav>
            <div className={styles.right}>
              <LiveIndicator />
              <UnitRequestIndicator />
              <BackupIndicator />
              <ChannelIndicator />
              <ScopeMenu />
              <UserMenu />
              <Clock />
              <Fullscreen />
            </div>
          </MenuBar>
        </AboutProvider>
      </MissionPrintProvider>
    </MissionCloseProvider>
  );
}

export default Nav;
