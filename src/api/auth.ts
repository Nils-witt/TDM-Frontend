import { type ApiTarget, request } from './client';

// Public settings for the authorization code + PKCE flow.
export type AuthConfig = {
  issuer: string;
  client_id: string;
  audience: string;
  scopes: string[];
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
  end_session_endpoint?: string;
};

// A user function or mission scope as named when the session started.
// An empty scope ID is the implicit Default scope (the API's "Global").
export type Attribution = { id: string; name: string };

// What a signed-in user works as: one user function in one mission scope.
export type ApiSession = {
  id: string;
  username: string;
  function: Attribution;
  scope: Attribution;
  // The UHS of an UHS function's session (named like the function); null
  // for others, absent from an API older than UHS.
  uhs?: Attribution | null;
  user_agent: string;
  created_at: string;
  last_seen: string;
};

// The caller as universalGoApi knows it, from the LDAP-synced user, with
// the effective permissions of the request.
export type Principal = {
  sub: string;
  username?: string;
  email?: string;
  name?: string;
  groups: string[];
  // Absent for proxy (client certificate) auth.
  expires_at?: string;
  // Member of the API's ADMIN_GROUP.
  admin: boolean;
  // Personal permissions always apply; functional ones come from the
  // session's user function. Both already include what they imply.
  permissions: { personal: string[]; functional: string[] };
  // The session the request named, null without one.
  session: ApiSession | null;
  // The views of the session's user function; null without a session (or
  // from an older API), which allows every view and page.
  views: FunctionViews | null;
};

// Which views a user function may use and the pages its responsive view
// shows. They only steer the UI: permissions still guard the data.
export type FunctionViews = { desktop: boolean; responsive: boolean; responsive_pages: string[] };

export const getAuthConfig = () =>
  request<AuthConfig>('/auth/config', undefined, { anonymous: true });

export const whoAmI = (anonymous = false, target?: ApiTarget) =>
  request<Principal>('/api/v1/whoami', undefined, { anonymous, target });

// Answers of an API older than the session model lack the fields.
export function normalizePrincipal(p: Principal): Principal {
  const perms = p.permissions as unknown;
  const permissions =
    perms && typeof perms === 'object' && !Array.isArray(perms)
      ? (perms as Principal['permissions'])
      : { personal: [], functional: [] };
  return {
    ...p,
    admin: p.admin ?? false,
    permissions,
    session: p.session ?? null,
    views: p.views ?? null,
  };
}
