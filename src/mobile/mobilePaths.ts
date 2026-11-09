import { mobileBasePath } from '@/app/mobileRoute';

export const mobilePaths = {
  missions: `${mobileBasePath}/missions`,
  newMission: `${mobileBasePath}/missions/new`,
  mission: (id: string) => `${mobileBasePath}/missions/${encodeURIComponent(id)}`,
  logbook: `${mobileBasePath}/logbook`,
  files: `${mobileBasePath}/files`,
  map: `${mobileBasePath}/map`,
  more: `${mobileBasePath}/more`,
};
