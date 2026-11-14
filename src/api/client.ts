import { offline, offlineMessage, reportNetworkError, reportRequestOk } from './connectivity';
import { getContent, putContent } from './offlineStore';

const trimSlashes = (url: string) => url.replace(/\/+$/, '');

// oidc: the API without client certificates, called with a bearer token.
// mtls: the API behind the reverse proxy that requires a client certificate.
export type ApiTarget = 'oidc' | 'mtls';

// Overridden by loadConfig() before the app renders. Without a separate mTLS
// URL both are the same API, which then accepts either.
const fallbackUrl = trimSlashes(import.meta.env.VITE_API_BASE_URL ?? '');
const baseUrls: Record<ApiTarget, string> = { oidc: fallbackUrl, mtls: fallbackUrl };

// Chosen by the session: mtls once a client certificate authenticated.
let target: ApiTarget = 'oidc';

export function setApiTarget(t: ApiTarget) {
  target = t;
}

type RuntimeConfig = {
  // Origin of universalGoApi for OIDC login. Empty or missing: keep
  // VITE_API_BASE_URL.
  apiBaseUrl?: string;
  // Origin that requires a client certificate. Empty or missing: apiBaseUrl.
  mtlsApiBaseUrl?: string;
};

// config.json is mounted into the container at runtime, so one image can
// serve any API without a rebuild.
export async function loadConfig(): Promise<void> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}config.json`, { cache: 'no-store' });
    if (!res.ok) {
      return;
    }
    const config = (await res.json()) as RuntimeConfig;
    if (config.apiBaseUrl) {
      baseUrls.oidc = trimSlashes(config.apiBaseUrl);
    }
    baseUrls.mtls = config.mtlsApiBaseUrl ? trimSlashes(config.mtlsApiBaseUrl) : baseUrls.oidc;
  } catch (err) {
    console.warn('config.json not loaded, using the build-time API URL', err);
  }
}

export const apiUrl = (path: string, t: ApiTarget = target) => `${baseUrls[t]}${path}`;

// The API URL is empty when the SPA and the API share an origin.
export function websocketUrl(path: string): string {
  const url = new URL(apiUrl(path), window.location.href);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.href;
}

// Dispatched on window on a 401 to an authenticated request: the app shows
// the login page again.
export const unauthorizedEvent = 'universam:unauthorized';

// Set by the session once logged in through OIDC; null for proxy (client
// certificate) auth, which sends no token.
let accessToken: () => string | null = () => null;

export function setAccessTokenSource(source: () => string | null) {
  accessToken = source;
}

export const currentAccessToken = () => accessToken();

// Set by the session: renews an expired token before a request is sent.
let refreshToken: () => Promise<void> = () => Promise.resolve();

export function setTokenRefresh(refresh: () => Promise<void>) {
  refreshToken = refresh;
}

const tokenListeners = new Set<() => void>();

// The session calls accessTokenRenewed after each renewal, so the event
// stream (api/events.ts) can hand the API the new token before the old one
// expires.
export function onAccessTokenRenewed(listener: () => void): () => void {
  tokenListeners.add(listener);
  return () => {
    tokenListeners.delete(listener);
  };
}

export function accessTokenRenewed() {
  tokenListeners.forEach((l) => l());
}

// For requests the app does not make through request(), such as the map's
// tile loads: the token, if the session has one.
export function authHeaders(): Record<string, string> {
  const token = accessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type RequestOptions = {
  // Neither sends the token nor reports a 401: for public endpoints and for
  // probing whether the client certificate alone authenticates.
  anonymous?: boolean;
  // Overrides the session's choice, for probing the mTLS API.
  target?: ApiTarget;
  // Milliseconds until the request is given up; 0 for none.
  timeout?: number;
};

// An API that accepts the connection but never answers would otherwise leave
// the app online with a spinner. Uploads and downloads take as long as they
// take.
export const requestTimeout = 30_000;

const withTimeout = (signal: AbortSignal | null | undefined, ms: number) => {
  if (ms <= 0) return signal ?? undefined;
  const timeout = AbortSignal.timeout(ms);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
};

async function send(
  path: string,
  init: RequestInit | undefined,
  { anonymous = false, target: requestTarget, timeout = 0 }: RequestOptions,
): Promise<Response> {
  // A FormData body sets its own multipart content type, with the boundary.
  const json = init?.body !== undefined && !(init.body instanceof FormData);
  const method = (init?.method ?? 'GET').toUpperCase();
  // The UI disables changes while offline; this catches any it missed.
  if (method !== 'GET' && method !== 'HEAD' && offline()) {
    throw new ApiError(0, offlineMessage);
  }
  if (!anonymous) await refreshToken();
  const token = anonymous ? null : accessToken();
  let res: Response;
  try {
    res = await fetch(apiUrl(path, requestTarget), {
      ...init,
      signal: withTimeout(init?.signal, timeout),
      // Lets the browser present a TLS client certificate to the API's origin.
      credentials: 'include',
      headers: {
        Accept: 'application/json, application/problem+json',
        ...(json && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...init?.headers,
      },
    });
  } catch (err) {
    // fetch rejects without an answer: the API or the network is down, or
    // it did not answer in time (TimeoutError). AbortError is the caller's.
    if (!(err instanceof DOMException && err.name === 'AbortError')) reportNetworkError();
    throw err;
  }
  reportRequestOk();
  if (res.status === 401 && !anonymous) {
    window.dispatchEvent(new Event(unauthorizedEvent));
  }
  if (!res.ok) {
    throw new ApiError(res.status, await errorMessage(res, init?.method ?? 'GET', path));
  }
  return res;
}

export async function request<T>(
  path: string,
  init?: RequestInit,
  options: RequestOptions = {},
): Promise<T> {
  const timeout = options.timeout ?? (init?.body instanceof FormData ? 0 : requestTimeout);
  const res = await send(path, init, { ...options, timeout });
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

// For content that needs the token, so a plain link or <img src> cannot load
// it.
export async function requestBlob(
  path: string,
  signal?: AbortSignal,
  init?: RequestInit,
): Promise<Blob> {
  const res = await send(path, { ...init, signal, headers: { Accept: '*/*' } }, {});
  return res.blob();
}

// requestBlob for GETs of content that does not change (file contents,
// report PDFs), kept for offline reading. Without an answer from the API the
// cached copy is returned, if there is one.
export async function requestCachedBlob(path: string, signal?: AbortSignal): Promise<Blob> {
  if (offline()) {
    const cached = await getContent(path);
    if (cached) return cached;
  }
  let blob: Blob;
  try {
    blob = await requestBlob(path, signal);
  } catch (err) {
    if (err instanceof ApiError || signal?.aborted) throw err;
    const cached = await getContent(path);
    if (cached) return cached;
    throw err;
  }
  void putContent(path, blob);
  return blob;
}

// The API answers errors as RFC 9457 problem details.
export async function errorMessage(res: Response, method: string, path: string): Promise<string> {
  const text = await res.text();
  try {
    const body = JSON.parse(text) as { detail?: string; title?: string; error?: string };
    const message = body.detail || body.error || body.title;
    if (message) {
      return message;
    }
  } catch {
    // not JSON
  }
  return `${method} ${path}: ${res.status} ${text}`;
}
