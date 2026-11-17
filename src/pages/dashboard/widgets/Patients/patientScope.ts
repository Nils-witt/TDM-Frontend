import type { SelectedScope } from '@/data/selectedScope';

// The scope filter of the tab's scope: its ID, null (the API's global) for
// Default, undefined for Global, which shows every patient.
export function patientScope(sel: Pick<SelectedScope, 'global' | 'scopeId'>, only: boolean) {
  if (!only || sel.global) return undefined;
  return sel.scopeId;
}
