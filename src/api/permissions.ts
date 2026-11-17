import { request } from './client';
import { groupsPath, usersPath } from './directory';

// Personal permissions are granted to users and groups and always apply;
// functional ones are held only through the user function of a session,
// for the data of its scope. The admin group holds every personal one
// without a grant; `admin` itself is not grantable.
export type PermissionKind = 'personal' | 'functional';

export type PermissionInfo = {
  name: string;
  area: string;
  kind: PermissionKind;
  // Granting the permission grants these too (directly).
  implies: string[];
  // Without these the permission has no effect (e.g. a historic permission
  // needs the function's view).
  requires: string[];
  description: string;
};

export const permissionsPath = '/api/v1/permissions';
// Under groupsPath and usersPath, so their changes reload them too.
export const groupPermissionsPath = (groupId: string) =>
  `${groupsPath}/${encodeURIComponent(groupId)}/permissions`;
export const userPermissionsPath = (userId: string) =>
  `${usersPath}/${encodeURIComponent(userId)}/permissions`;

// Older APIs list only names and descriptions: those count as personal.
export const fetchPermissionCatalog = (path: string) =>
  request<{ permissions: PermissionInfo[] }>(path).then((r) =>
    r.permissions.map((p) => ({
      ...p,
      area: p.area ?? p.name.split('.')[0],
      kind: p.kind ?? 'personal',
      implies: p.implies ?? [],
      requires: p.requires ?? [],
    })),
  );
export const fetchGroupPermissions = (path: string) =>
  request<{ permissions: string[] }>(path).then((r) => r.permissions);

// What granting names grants besides them, by the catalog's implications.
export function impliedBy(
  catalog: readonly PermissionInfo[],
  names: Iterable<string>,
): Set<string> {
  const byName = new Map(catalog.map((p) => [p.name, p]));
  const out = new Set<string>();
  const visit = (name: string) => {
    for (const i of byName.get(name)?.implies ?? []) {
      if (out.has(i)) continue;
      out.add(i);
      visit(i);
    }
  };
  for (const n of names) visit(n);
  return out;
}

const replace = (path: string, permissions: string[]) =>
  request<{ permissions: string[] }>(path, {
    method: 'PUT',
    body: JSON.stringify({ permissions }),
  }).then((r) => r.permissions);

export const groupPermissionsApi = {
  // Replaces every grant of the group; returns them sorted.
  replace: (groupId: string, permissions: string[]) =>
    replace(groupPermissionsPath(groupId), permissions),
};

export const userPermissionsApi = {
  // Replaces the grants of the user (not those of their groups).
  replace: (userId: string, permissions: string[]) =>
    replace(userPermissionsPath(userId), permissions),
};
