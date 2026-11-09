import { request } from './client';
import type { EntityMeta } from './entity';

// The LDAP directory as universalGoApi stores it; read-only, admin group only.

export type Group = EntityMeta & {
  id: string;
  // Canonical (lowercase RFC 4514) DN.
  dn: string;
  // The CN.
  name: string;
};

export type Member = EntityMeta & {
  id: string;
  // The LDAP ID, not the API's.
  directory_id: string;
  // Absent if another LDAP entry took the username over.
  username?: string;
  email?: string;
  name?: string;
  // No longer in LDAP.
  disabled: boolean;
};

export type User = Member & { groups: Group[] };

export type GroupMembers = { group: Group; members: Member[] };

export const usersPath = '/api/v1/users';
// Only groups with at least one member.
export const groupsPath = '/api/v1/groups';
export const groupMembersPath = (id: string) => `${groupsPath}/${encodeURIComponent(id)}/members`;

// The directory lists are not paged.
export const fetchUsers = (path: string) => request<{ users: User[] }>(path).then((r) => r.users);
export const fetchGroups = (path: string) =>
  request<{ groups: Group[] }>(path).then((r) => r.groups);

export const memberName = (m: Member) => m.name || m.username || m.directory_id;
