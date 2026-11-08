const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

export const apiUrl = (path: string) => `${baseUrl}${path}`;

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
};

export async function request<T>(
  path: string,
  init?: RequestInit,
  { anonymous = false }: RequestOptions = {},
): Promise<T> {
  // A FormData body sets its own multipart content type, with the boundary.
  const json = init?.body !== undefined && !(init.body instanceof FormData);
  const token = anonymous ? null : accessToken();
  const res = await fetch(apiUrl(path), {
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
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
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
