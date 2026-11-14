import { describe, expect, it } from 'vitest';
import { errorMessage } from './client';

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
