import { request } from './client';
import type { EntityMeta } from './entity';
import { listFetcher } from './list';
import { useResource } from './resource';

// UHS (Unfallhilfsstellen): places patients are cared for, each in one
// mission scope. The API lists the session scope's (replicated like the
// catalogs, useCatalogs().uhs); every scope's (?all=true) needs uhs.manage.
// Each UHS has its own user function (function), whose sessions see only
// the patients currently in it.
export type Uhs = EntityMeta & {
  id: string;
  name: string;
  active: boolean;
  // null for Global / Default.
  scope: string | null;
  function?: string | null;
  // The patients currently in it.
  patient_count?: number;
};

// The API's limit: an UHS names its user function.
export const uhsNameMax = 100;

export const uhsListPath = '/api/v1/uhs';
export const uhsPath = (id: string) => `${uhsListPath}/${encodeURIComponent(id)}`;
export const allUhsPath = `${uhsListPath}?all=true`;

export const fetchUhs = listFetcher<Uhs>('uhs');

// Every scope's UHS, for the admin widget (uhs.manage); null loads nothing.
export const useAllUhs = (enabled: boolean) =>
  useResource<Uhs[]>(enabled ? allUhsPath : null, fetchUhs);

const ifMatch = (u: Uhs) => ({ 'If-Match': `"${u.updated_at}"` });

export const uhsApi = {
  // scope: an ID, null for Default; undefined for the session's.
  create: (input: { name: string; scope?: string | null; active?: boolean }) =>
    request<Uhs>(uhsListPath, { method: 'POST', body: JSON.stringify(input) }),
  patch: (u: Uhs, fields: { name?: string; active?: boolean }) =>
    request<Uhs>(uhsPath(u.id), {
      method: 'PATCH',
      headers: ifMatch(u),
      body: JSON.stringify(fields),
    }),
  // 409 while patients are in it.
  remove: (u: Uhs) => request<void>(uhsPath(u.id), { method: 'DELETE', headers: ifMatch(u) }),
};
