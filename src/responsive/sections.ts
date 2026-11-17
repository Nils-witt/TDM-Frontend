import type { FunctionPage } from '@/api/sessions';
import { responsivePaths } from './paths';

export type Section = {
  to: string;
  label: string;
  icon: string;
  // The user function decides whether it is shown; Settings has none and is
  // always shown.
  page?: FunctionPage;
};

export const sections: readonly Section[] = [
  // Only UHS functions have it, as their only page.
  { to: responsivePaths.uhs, label: 'UHS', icon: 'local_hospital', page: 'uhs' },
  { to: responsivePaths.missions, label: 'Missions', icon: 'list_alt', page: 'missions' },
  { to: responsivePaths.archive, label: 'Archive', icon: 'manage_search', page: 'archive' },
  { to: responsivePaths.map, label: 'Map', icon: 'map', page: 'map' },
  { to: responsivePaths.reports, label: 'Reports', icon: 'description', page: 'reports' },
  { to: responsivePaths.settings, label: 'Settings', icon: 'settings' },
];

export const visibleSections = (pages: ReadonlySet<FunctionPage>) =>
  sections.filter((s) => s.page === undefined || pages.has(s.page));

// Where /m and unknown or hidden paths lead: the first shown section, which
// is Settings when the function shows no page.
export const homePath = (pages: ReadonlySet<FunctionPage>) =>
  visibleSections(pages)[0]?.to ?? responsivePaths.settings;
