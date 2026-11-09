import { mobileBasePath } from '@/app/mobileRoute';

// Every route of the responsive UI lives below this prefix, so it can link
// within itself without knowing about the desktop dashboard.
export const responsivePaths = {
  root: mobileBasePath,
  missions: `${mobileBasePath}/missions`,
  map: `${mobileBasePath}/map`,
  settings: `${mobileBasePath}/settings`,
  mission: (id: string) => `${mobileBasePath}/missions/${encodeURIComponent(id)}`,
};
