import type { ApiSession, Principal } from './auth';
import { ApiError, request } from './client';

// A user function the caller may work as, with its functional permissions.
// `all` is the admin group's All permissions function.
export type UserFunction = {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  // Group IDs whose members may choose it.
  groups: string[];
  // At least one view; absent from an API older than views.
  views?: View[];
  responsive_pages?: FunctionPage[];
  // The UHS of an UHS function (scope null for Default), null for others.
  // Its sessions work in that scope only and see only the UHS's patients;
  // its name, permissions (patients.view / .edit) and views are fixed.
  uhs?: { id: string; name: string; scope: string | null } | null;
  // Messages can be addressed to it; always_cc (only with it) adds it as CC
  // to every message. Absent from an API older than the chat.
  can_receive_messages?: boolean;
  always_cc?: boolean;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
};

export type View = 'desktop' | 'responsive';
export const viewIds: readonly View[] = ['desktop', 'responsive'];

// The configurable pages of the responsive view (/m); Settings is always
// shown. uhs, the UHS view, is only for UHS functions (fixed by the API).
export const responsivePageIds = ['missions', 'archive', 'map', 'reports', 'messages'] as const;
export type ResponsivePage = (typeof responsivePageIds)[number];
export type FunctionPage = ResponsivePage | 'uhs';

// The scope a session of fn must work in: its UHS's (null for Default), or
// undefined when the user picks.
export const fixedScopeOf = (
  fn: Pick<UserFunction, 'uhs'> | undefined,
): string | null | undefined => (fn?.uhs ? fn.uhs.scope : undefined);

// A mission scope a session can work in; id '' is the Default scope
// (missions and units without one).
export type ScopeChoice = { id: string; name: string };

export type SessionChoices = { functions: UserFunction[]; scopes: ScopeChoice[] };

// What the user picks: a function, and a scope (null for Default).
export type SessionChoice = { function: string; scope: string | null };

export type SessionStarted = { session: ApiSession; whoami: Principal };

// Another session in the scope of the caller's (or the caller's own, `own`),
// without its ID and browser.
export type ScopePeer = Pick<
  ApiSession,
  'username' | 'function' | 'uhs' | 'created_at' | 'last_seen'
> & {
  own: boolean;
};

export const choicesPath = '/api/v1/me/functions';
export const ownSessionsPath = '/api/v1/me/sessions';
export const sessionsPath = '/api/v1/sessions';
// Who works in the current session's scope; needs no permission.
export const scopeSessionsPath = `${sessionsPath}/current/scope`;
export const userFunctionsPath = '/api/v1/user-functions';
export const userFunctionPath = (id: string) => `${userFunctionsPath}/${encodeURIComponent(id)}`;

export const fetchChoices = (path: string) => request<SessionChoices>(path);
export const fetchSessions = (path: string) =>
  request<{ sessions: ApiSession[] }>(path).then((r) => r.sessions);
// null from an API older than the endpoint.
export const fetchScopePeers = (path: string) =>
  request<{ sessions: ScopePeer[] }>(path).then(
    (r) => r.sessions,
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    },
  );
export const fetchUserFunctions = (path: string) =>
  request<{ functions: UserFunction[] }>(path).then((r) => r.functions);

export const sessionApi = {
  start: (c: SessionChoice) =>
    request<SessionStarted>(sessionsPath, { method: 'POST', body: JSON.stringify(c) }),
  // Ends the current session and starts one with the new choice.
  switch: (c: SessionChoice) =>
    request<SessionStarted>(`${sessionsPath}/current`, {
      method: 'PATCH',
      body: JSON.stringify(c),
    }),
  endCurrent: () => request<void>(`${sessionsPath}/current`, { method: 'DELETE' }),
  // Needs sessions.manage.
  end: (id: string) =>
    request<void>(`${sessionsPath}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

export const userFunctionApi = {
  create: (name: string, description: string) =>
    request<UserFunction>(userFunctionsPath, {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    }),
  // Clearing can_receive_messages clears always_cc too.
  update: (
    id: string,
    patch: {
      name?: string;
      description?: string;
      can_receive_messages?: boolean;
      always_cc?: boolean;
    },
  ) =>
    request<UserFunction>(userFunctionPath(id), { method: 'PATCH', body: JSON.stringify(patch) }),
  remove: (id: string) => request<void>(userFunctionPath(id), { method: 'DELETE' }),
  setPermissions: (id: string, permissions: string[]) =>
    request<UserFunction>(`${userFunctionPath(id)}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    }),
  setGroups: (id: string, groups: string[]) =>
    request<UserFunction>(`${userFunctionPath(id)}/groups`, {
      method: 'PUT',
      body: JSON.stringify({ groups }),
    }),
  setViews: (id: string, views: View[], pages: ResponsivePage[]) =>
    request<UserFunction>(`${userFunctionPath(id)}/views`, {
      method: 'PUT',
      body: JSON.stringify({ views, responsive_pages: pages }),
    }),
};

// The session is per browser: every tab works as the same function in the
// same scope, so switching in one tab switches all of them (the storage
// event). The user is stored with it, so another user signing in on the
// same browser never sends it.
export const sessionStorageKey = 'universam.session';
// The last choice per user, preselected by the picker.
const lastChoiceKey = 'universam.lastSession';

type StoredSession = { id: string; username: string };

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage blocked: the session lasts until this tab is reloaded
  }
}

let memory: StoredSession | null = null;

const usernameOf = (p: Pick<Principal, 'username' | 'sub'>) => (p.username ?? p.sub).toLowerCase();

// The stored session ID, if it belongs to user (any user when null).
export function storedSessionId(user?: Pick<Principal, 'username' | 'sub'> | null): string | null {
  const s = read<StoredSession>(sessionStorageKey) ?? memory;
  if (!s) return null;
  if (user && s.username !== usernameOf(user)) return null;
  return s.id;
}

export function storeSession(user: Pick<Principal, 'username' | 'sub'>, id: string) {
  memory = { id, username: usernameOf(user) };
  write(sessionStorageKey, memory);
}

export function forgetSession() {
  memory = null;
  write(sessionStorageKey, null);
}

type LastChoices = Record<string, SessionChoice>;

export function lastChoice(user: Pick<Principal, 'username' | 'sub'>): SessionChoice | null {
  return read<LastChoices>(lastChoiceKey)?.[usernameOf(user)] ?? null;
}

export function rememberChoice(user: Pick<Principal, 'username' | 'sub'>, c: SessionChoice) {
  write(lastChoiceKey, { ...read<LastChoices>(lastChoiceKey), [usernameOf(user)]: c });
}
