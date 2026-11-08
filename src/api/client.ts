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

// Dispatched on window on a 401 to an authenticated request: the app shows
// the login page again.
export const unauthorizedEvent = 'universam:unauthorized';

// Set by the session once logged in through OIDC; null for proxy (client
// certificate) auth, which sends no token.
let accessToken: () => string | null = () => null;

export function setAccessTokenSource(source: () => string | null) {
  accessToken = source;
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
};

async function send(
  path: string,
  init: RequestInit | undefined,
  { anonymous = false, target: requestTarget }: RequestOptions,
): Promise<Response> {
  // A FormData body sets its own multipart content type, with the boundary.
  const json = init?.body !== undefined && !(init.body instanceof FormData);
  const token = anonymous ? null : accessToken();
  const res = await fetch(apiUrl(path, requestTarget), {
    ...init,
    // Lets the browser present a TLS client certificate to the API's origin.
    credentials: 'include',
    headers: {
      Accept: 'application/json, application/problem+json',
      ...(json && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
      ...init?.headers,
    },
  });
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
  const res = await send(path, init, options);
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

// For content that needs the token, so a plain link or <img src> cannot load
// it.
export async function requestBlob(path: string, signal?: AbortSignal): Promise<Blob> {
  const res = await send(path, { signal, headers: { Accept: '*/*' } }, {});
  return res.blob();
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
