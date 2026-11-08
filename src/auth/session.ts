import { type User, UserManager, WebStorageStateStore } from 'oidc-client-ts';
import { type AuthConfig, getAuthConfig, type Principal, whoAmI } from '@/api/auth';
import { ApiError, hasSeparateMtlsApi, setAccessTokenSource, setApiTarget } from '@/api/client';

// oidc: logged in through Authentik, with a bearer token. proxy: the reverse
// proxy authenticated a TLS client certificate; there is no token and no
// logout.
export type AuthMode = 'oidc' | 'proxy';

export type SessionStart =
  | { status: 'signedIn'; principal: Principal; mode: AuthMode }
  | { status: 'signedOut'; error: string | null };

// Must be a redirect URI of the Authentik provider.
export const callbackPath = '/callback';

type LoginState = { returnTo: string };

let config: AuthConfig | null = null;
let manager: UserManager | null = null;
let user: User | null = null;

setAccessTokenSource(() => (user && !user.expired ? user.access_token : null));

function createManager(c: AuthConfig): UserManager {
  const m = new UserManager({
    authority: c.issuer,
    client_id: c.client_id,
    redirect_uri: `${window.location.origin}${callbackPath}`,
    post_logout_redirect_uri: `${window.location.origin}/`,
    response_type: 'code',
    scope: c.scopes.join(' '),
    // From /auth/config, so no discovery request to Authentik is needed.
    metadata: {
      issuer: c.issuer,
      authorization_endpoint: c.authorization_endpoint,
      token_endpoint: c.token_endpoint,
      userinfo_endpoint: c.userinfo_endpoint,
      end_session_endpoint: c.end_session_endpoint,
    },
    // Per tab, surviving reloads.
    userStore: new WebStorageStateStore({ store: window.sessionStorage }),
    // Renews with the refresh token, which Authentik only issues for the
    // offline_access scope; without one the session ends when the token
    // expires.
    automaticSilentRenew: true,
    loadUserInfo: false,
  });
  m.events.addUserLoaded((u) => {
    user = u;
  });
  m.events.addUserUnloaded(() => {
    user = null;
  });
  return m;
}

async function ensureManager(): Promise<UserManager> {
  if (!manager) {
    config = await getAuthConfig();
    manager = createManager(config);
  }
  return manager;
}

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

async function signInWithToken(m: UserManager): Promise<SessionStart> {
  try {
    return { status: 'signedIn', principal: await whoAmI(), mode: 'oidc' };
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      await m.removeUser();
      return { status: 'signedOut', error: err.message };
    }
    throw err;
  }
}

// The principal when a client certificate alone authenticates; then no login
// is needed.
async function probeClientCertificate(): Promise<Principal | null> {
  try {
    const principal = await whoAmI(true, 'mtls');
    setApiTarget('mtls');
    return principal;
  } catch (err) {
    setApiTarget('oidc');
    // A proxy on its own URL may refuse a browser without a certificate
    // during the TLS handshake (a network error) or with a 400 or 403, not
    // only with a 401.
    if (hasSeparateMtlsApi() || (err instanceof ApiError && err.status === 401)) {
      return null;
    }
    throw err;
  }
}

async function start(): Promise<SessionStart> {
  if (window.location.pathname === callbackPath) {
    const m = await ensureManager();
    setApiTarget('oidc');
    try {
      user = await m.signinRedirectCallback();
    } catch (err) {
      window.history.replaceState(null, '', '/');
      return { status: 'signedOut', error: `Login failed: ${message(err)}` };
    }
    const state = user.state as LoginState | undefined;
    window.history.replaceState(null, '', state?.returnTo ?? '/');
    return signInWithToken(m);
  }

  const principal = await probeClientCertificate();
  if (principal) {
    return { status: 'signedIn', principal, mode: 'proxy' };
  }

  const m = await ensureManager();
  user = await m.getUser();
  if (user?.expired && user.refresh_token) {
    try {
      user = await m.signinSilent();
    } catch {
      user = null;
    }
  }
  if (!user || user.expired) {
    await m.removeUser();
    return { status: 'signedOut', error: null };
  }
  return signInWithToken(m);
}

// Once per page load: React's StrictMode runs effects twice, and a login
// callback can only be redeemed once.
let started: Promise<SessionStart> | null = null;

// Rejects when the API cannot be reached or answers other than 401.
export function startSession(): Promise<SessionStart> {
  started ??= start().finally(() => {
    started = null;
  });
  return started;
}

export async function login() {
  const m = await ensureManager();
  const returnTo = `${window.location.pathname}${window.location.search}`;
  const state: LoginState = { returnTo: returnTo === callbackPath ? '/' : returnTo };
  await m.signinRedirect({ state });
}

// Ends the Authentik session too when the provider offers an end-session
// endpoint; else only this tab's tokens are dropped.
export async function logout(): Promise<'redirected' | 'local'> {
  const m = await ensureManager();
  if (config?.end_session_endpoint && user) {
    await m.signoutRedirect({ id_token_hint: user.id_token });
    return 'redirected';
  }
  await m.removeUser();
  return 'local';
}

export async function dropTokens() {
  await manager?.removeUser();
  user = null;
}

// The token could not be renewed in time.
export function onTokenExpired(listener: () => void): () => void {
  if (!manager) return () => undefined;
  const m = manager;
  m.events.addAccessTokenExpired(listener);
  return () => m.events.removeAccessTokenExpired(listener);
}
