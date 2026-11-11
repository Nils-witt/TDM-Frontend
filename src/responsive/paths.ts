import { mobileBasePath } from '@/app/mobileRoute';

// Every route of the responsive UI lives below this prefix, so it can link
// within itself without knowing about the desktop dashboard.
export const responsivePaths = {
  root: mobileBasePath,
  missions: `${mobileBasePath}/missions`,
  archive: `${mobileBasePath}/archive`,
  map: `${mobileBasePath}/map`,
  reports: `${mobileBasePath}/reports`,
  settings: `${mobileBasePath}/settings`,
  mission: (id: string) => `${mobileBasePath}/missions/${encodeURIComponent(id)}`,
  // The Map page selects the mission and flies to it.
  // The Reports page filtered by the mission.
  missionReports: (id: string) => `${mobileBasePath}/reports?mission=${encodeURIComponent(id)}`,
  missionOnMap: (id: string) => `${mobileBasePath}/map?mission=${encodeURIComponent(id)}`,
};
