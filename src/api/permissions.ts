import { request } from './client';
import { groupsPath } from './directory';

// Permissions admins grant to directory groups. The admin group holds all of
// them without a grant; `admin` itself is not grantable.

export type PermissionInfo = { name: string; description: string };

export const permissionsPath = '/api/v1/permissions';
// Under groupsPath, so group changes reload it too.
export const groupPermissionsPath = (groupId: string) =>
  `${groupsPath}/${encodeURIComponent(groupId)}/permissions`;

// Mirrors the API's domain.NewPermissionSet: granting the key grants these too.
export const impliedPermissions: Record<string, string[]> = {
  'missions.closed.view': ['missions.closed.search'],
};

export const fetchPermissionCatalog = (path: string) =>
  request<{ permissions: PermissionInfo[] }>(path).then((r) => r.permissions);
export const fetchGroupPermissions = (path: string) =>
  request<{ permissions: string[] }>(path).then((r) => r.permissions);

export const groupPermissionsApi = {
  // Replaces every grant of the group; returns them sorted.
  replace: (groupId: string, permissions: string[]) =>
    request<{ permissions: string[] }>(groupPermissionsPath(groupId), {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    }).then((r) => r.permissions),
};
