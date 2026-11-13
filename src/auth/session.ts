import { type User, UserManager, WebStorageStateStore } from 'oidc-client-ts';
import { type AuthConfig, getAuthConfig, type Principal, whoAmI } from '@/api/auth';
import {
  accessTokenRenewed,
  ApiError,
  setAccessTokenSource,
  setApiTarget,
  setTokenRefresh,
} from '@/api/client';
import { isNetworkError } from '@/api/connectivity';
import { clearOffline, loadSession, saveSession } from '@/api/offlineStore';

// oidc: logged in through Authentik, with a bearer token. proxy: the reverse
// proxy authenticated a TLS client certificate; there is no token.
export type AuthMode = 'oidc' | 'proxy';

// offline: the API could not be reached, so this is the user last signed in,
// from the offline store, without checking a token.
export type SessionStart =
  | { status: 'signedIn'; principal: Principal; mode: AuthMode; offline?: boolean }
  | { status: 'signedOut'; error: string | null };

// Must be a redirect URI of the Authentik provider.
export const callbackPath = '/callback';

type LoginState = { returnTo: string };

let config: AuthConfig | null = null;
let manager: UserManager | null = null;
let user: User | null = null;

setAccessTokenSource(() => (user && !user.expired ? user.access_token : null));

// Seconds the current access token was valid for when this tab got it.
let tokenLifetime = 0;

function setUser(u: User | null) {
  user = u;
  tokenLifetime = u?.expires_in ?? 0;
  scheduleRenewal();
}

// One refresh at a time: Authentik rotates refresh tokens, so a second
// request with the same one would be refused and end the session.
let renewing: Promise<void> | null = null;

function renew(): Promise<void> {
  const m = manager;
  if (!m || !user?.refresh_token) return Promise.resolve();
  renewing ??= m
    .signinSilent()
    .then(() => {
      retryDelay = 0;
    })
    .finally(() => {
      renewing = null;
    });
  return renewing;
}

// The library's own renewal runs once per token and gives up after an
// error, and its timer is late in a throttled or sleeping background tab.
// This one renews early, retries while the provider cannot be reached, and
// checks again whenever the tab or the network comes back.
let renewalTimer: ReturnType<typeof setTimeout> | undefined;
let retryDelay = 0;
const minRetryDelay = 5_000;
const maxRetryDelay = 60_000;

// Ahead of expiry by half the lifetime, at most two minutes: background
// tabs may run timers only once a minute.
function renewalLead(): number {
  return Math.min(120, tokenLifetime / 2);
}

function scheduleRenewal(delay?: number) {
  clearTimeout(renewalTimer);
  renewalTimer = undefined;
  if (!user?.refresh_token) return;
  const wait = delay ?? Math.max(0, ((user.expires_in ?? 0) - renewalLead()) * 1000);
  renewalTimer = setTimeout(renewInBackground, wait);
}

function renewInBackground() {
  renew().catch((err: unknown) => {
    // A refused refresh token cannot recover; the session ends at expiry.
    if (!isNetworkError(err)) return;
    retryDelay = Math.min(maxRetryDelay, Math.max(minRetryDelay, retryDelay * 2));
    scheduleRenewal(retryDelay);
  });
}

function renewIfDue() {
  if (renewing || !user?.refresh_token) return;
  if ((user.expires_in ?? 0) <= renewalLead()) renewInBackground();
}

window.addEventListener('online', renewIfDue);
window.addEventListener('focus', renewIfDue);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') renewIfDue();
});

// Before a request with an expired (or about to expire) token, so it is not
// sent without one and answered with a 401. A failed renewal is left to the
// background retry and the 401.
setTokenRefresh(async () => {
  if (!user?.refresh_token || (user.expires_in ?? 0) > 10) return;
  try {
    await renew();
  } catch {
    // see above
  }
});

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
    // Renewed by scheduleRenewal with the refresh token, which Authentik only
    // issues for the offline_access scope; without one the session ends when
    // the token expires.
    automaticSilentRenew: false,
    loadUserInfo: false,
  });
  m.events.addUserLoaded((u) => {
    setUser(u);
    accessTokenRenewed();
  });
  m.events.addUserUnloaded(() => {
    setUser(null);
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

// Set once a client certificate authenticated in this tab, so a reload does
// not need the login page again. Per tab, like the OIDC tokens.
const certificateKey = 'universam.clientCertificate';

function rememberCertificate(remember: boolean) {
  try {
    if (remember) window.sessionStorage.setItem(certificateKey, '1');
    else window.sessionStorage.removeItem(certificateKey);
  } catch {
    // storage blocked: the login page shows again after a reload
  }
}

function certificateRemembered(): boolean {
  try {
    return window.sessionStorage.getItem(certificateKey) === '1';
  } catch {
    return false;
  }
}

// Only on request: without a certificate the browser may prompt for one, or
// the proxy refuses the TLS handshake.
async function probeClientCertificate(): Promise<Principal> {
  try {
    const principal = await whoAmI(true, 'mtls');
    setApiTarget('mtls');
    rememberCertificate(true);
    return principal;
  } catch (err) {
    setApiTarget('oidc');
    rememberCertificate(false);
    throw err;
  }
}

export async function loginWithCertificate(): Promise<Principal> {
  try {
    return await probeClientCertificate();
  } catch (err) {
    if (err instanceof ApiError) {
      throw new Error(`Client certificate not accepted: ${err.message}`, { cause: err });
    }
    // A refused TLS handshake reaches fetch only as a generic network error.
    throw new Error(
      'Client certificate login failed. Is a certificate installed in this browser?',
      {
        cause: err,
      },
    );
  }
}

async function start(): Promise<SessionStart> {
  if (window.location.pathname === callbackPath) {
    const m = await ensureManager();
    setApiTarget('oidc');
    let signedIn: User;
    try {
      signedIn = await m.signinRedirectCallback();
    } catch (err) {
      window.history.replaceState(null, '', '/');
      return { status: 'signedOut', error: `Login failed: ${message(err)}` };
    }
    setUser(signedIn);
    const state = signedIn.state as LoginState | undefined;
    window.history.replaceState(null, '', state?.returnTo ?? '/');
    return signInWithToken(m);
  }

  if (certificateRemembered()) {
    try {
      return { status: 'signedIn', principal: await probeClientCertificate(), mode: 'proxy' };
    } catch {
      // The certificate is no longer accepted: show the login page.
    }
  }

  const m = await ensureManager();
  setUser(await m.getUser());
  if (user?.expired && user.refresh_token) {
    try {
      await renew();
    } catch (err) {
      // Keep the tokens for when the provider can be reached again.
      if (isNetworkError(err)) throw err;
      setUser(null);
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

// Without an answer from the API, the user last signed in may still read
// what was cached for them.
async function startOffline(err: unknown): Promise<SessionStart> {
  if (!isNetworkError(err)) throw err;
  const saved = await loadSession();
  if (!saved) throw err;
  if (saved.mode === 'proxy') {
    // So the next attempt probes the certificate again, also in a new tab.
    setApiTarget('mtls');
    rememberCertificate(true);
  } else if (!manager && saved.config) {
    // The tab's tokens, if any, are sent once the API answers again.
    config = saved.config;
    manager = createManager(saved.config);
    setUser(await manager.getUser());
  }
  return { status: 'signedIn', principal: saved.principal, mode: saved.mode, offline: true };
}

// Rejects when the API cannot be reached (and nobody signed in before) or
// answers other than 401.
export function startSession(): Promise<SessionStart> {
  started ??= start()
    .catch(startOffline)
    .finally(() => {
      started = null;
    });
  return started;
}

// Stores who signed in, for an offline start.
export const rememberSession = (principal: Principal, mode: AuthMode) =>
  saveSession(principal, mode, config ?? undefined);

export { clearOffline };

export async function login() {
  const m = await ensureManager();
  const returnTo = `${window.location.pathname}${window.location.search}`;
  const state: LoginState = { returnTo: returnTo === callbackPath ? '/' : returnTo };
  await m.signinRedirect({ state });
}

// Ends the Authentik session too when the provider offers an end-session
// endpoint; else only this tab's tokens are dropped.
export async function logout(): Promise<'redirected' | 'local'> {
  if (certificateRemembered()) {
    rememberCertificate(false);
    setApiTarget('oidc');
    return 'local';
  }
  const m = await ensureManager();
  if (config?.end_session_endpoint && user) {
    await m.signoutRedirect({ id_token_hint: user.id_token });
    return 'redirected';
  }
  await m.removeUser();
  return 'local';
}

export async function dropTokens() {
  rememberCertificate(false);
  setApiTarget('oidc');
  await manager?.removeUser();
  setUser(null);
}

// The token could not be renewed in time.
export function onTokenExpired(listener: () => void): () => void {
  if (!manager) return () => undefined;
  const m = manager;
  m.events.addAccessTokenExpired(listener);
  return () => m.events.removeAccessTokenExpired(listener);
}
