import { mobileBasePath } from '@/app/mobileRoute';

// Every route of the responsive UI lives below this prefix, so it can link
// within itself without knowing about the desktop dashboard.
export const responsivePaths = {
  root: mobileBasePath,
  missions: `${mobileBasePath}/missions`,
  newMission: `${mobileBasePath}/missions/new`,
  archive: `${mobileBasePath}/archive`,
  map: `${mobileBasePath}/map`,
  reports: `${mobileBasePath}/reports`,
  settings: `${mobileBasePath}/settings`,
  // The UHS view of an UHS function's session.
  uhs: `${mobileBasePath}/uhs`,
  uhsNewPatient: `${mobileBasePath}/uhs/new`,
  uhsPatient: (id: string) => `${mobileBasePath}/uhs/patients/${encodeURIComponent(id)}`,
  // The patient's transport request and its destination.
  uhsTransport: (id: string) =>
    `${mobileBasePath}/uhs/patients/${encodeURIComponent(id)}/transport`,
  mission: (id: string) => `${mobileBasePath}/missions/${encodeURIComponent(id)}`,
  // The Map page selects the mission and flies to it.
  // The Reports page filtered by the mission.
  missionReports: (id: string) => `${mobileBasePath}/reports?mission=${encodeURIComponent(id)}`,
  missionOnMap: (id: string) => `${mobileBasePath}/map?mission=${encodeURIComponent(id)}`,
};
