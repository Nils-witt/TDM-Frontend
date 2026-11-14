import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorMessage, request } from './client';
import { offline, reportRequestOk } from './connectivity';

const res = (status: number, body: string) => new Response(body, { status });

describe('errorMessage', () => {
  it('prefers the problem detail, then error and title', async () => {
    expect(
      await errorMessage(res(400, '{"title":"Bad","detail":"Name taken"}'), 'POST', '/x'),
    ).toBe('Name taken');
    expect(await errorMessage(res(400, '{"error":"nope"}'), 'POST', '/x')).toBe('nope');
    expect(await errorMessage(res(400, '{"title":"Bad"}'), 'POST', '/x')).toBe('Bad');
  });

  it('falls back to method, path, status and text', async () => {
    expect(await errorMessage(res(502, 'Bad Gateway'), 'GET', '/api/v1/x')).toBe(
      'GET /api/v1/x: 502 Bad Gateway',
    );
    expect(await errorMessage(res(500, '{}'), 'GET', '/y')).toBe('GET /y: 500 {}');
  });
});

describe('request timeout', () => {
  const hang = (_url: string, init?: RequestInit) =>
    new Promise<Response>((_, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal!.reason));
    });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('gives up a request that gets no answer and counts the app offline', async () => {
    vi.stubGlobal('fetch', vi.fn(hang));
    const pending = request('/api/v1/missions', undefined, { anonymous: true, timeout: 20 });
    await expect(pending).rejects.toMatchObject({ name: 'TimeoutError' });
    expect(offline()).toBe(true);
  });

  it('keeps a caller abort silent', async () => {
    reportRequestOk();
    vi.stubGlobal('fetch', vi.fn(hang));
    const ctl = new AbortController();
    const pending = request('/api/v1/missions', { signal: ctl.signal }, { anonymous: true });
    ctl.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(offline()).toBe(false);
  });

  it('sets no timeout on uploads', async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetch);
    reportRequestOk();
    await request(
      '/api/v1/log-files',
      { method: 'POST', body: new FormData() },
      { anonymous: true },
    );
    const calls = fetch.mock.calls as unknown as [string, RequestInit][];
    expect(calls[0][1].signal).toBeUndefined();
  });
});
