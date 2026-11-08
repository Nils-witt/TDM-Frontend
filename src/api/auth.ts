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

// The caller as universalGoApi knows it, from the LDAP-synced user.
export type Principal = {
  sub: string;
  username?: string;
  email?: string;
  name?: string;
  groups: string[];
  // Absent for proxy (client certificate) auth.
  expires_at?: string;
};

export const getAuthConfig = () =>
  request<AuthConfig>('/auth/config', undefined, { anonymous: true });

export const whoAmI = (anonymous = false, target?: ApiTarget) =>
  request<Principal>('/api/v1/whoami', undefined, { anonymous, target });
