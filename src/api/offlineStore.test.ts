import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearOffline,
  getContent,
  getResource,
  hasDigest,
  keepContentOut,
  putContent,
  putResource,
  putRow,
  readScope,
  type Scope,
  writeScope,
} from './offlineStore';

const day = 24 * 60 * 60 * 1000;
const mission = (value: string): Scope => ({ table: 'log_entries', index: 'mission', value });
const entry = (id: string, m: string) => ({ id, mission: m, text: id });

beforeEach(async () => {
  await clearOffline();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('scopes', () => {
  it('replaces a scope rows and leaves other scopes alone', async () => {
    await writeScope('a', mission('m1'), [entry('1', 'm1'), entry('2', 'm1')]);
    await writeScope('b', mission('m2'), [entry('3', 'm2')]);
    // The API left 2 out: it was revoked.
    await writeScope('a', mission('m1'), [entry('1', 'm1')]);

    const a = await readScope('a', mission('m1'));
    expect(a?.rows.map((r) => r.id)).toEqual(['1']);
    expect(a?.syncedAt).toBeTypeOf('number');
    expect((await readScope('b', mission('m2')))?.rows.map((r) => r.id)).toEqual(['3']);
  });

  it('reports a scope never synced, and one synced too long ago', async () => {
    expect((await readScope('a', mission('m1')))?.syncedAt).toBeUndefined();
    await writeScope('a', mission('m1'), [entry('1', 'm1')]);
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + day + 1);
    const a = await readScope('a', mission('m1'));
    expect(a?.syncedAt).toBeUndefined();
  });
});

describe('resources', () => {
  it('returns a stored resource until it expires', async () => {
    await putResource('/api/v1/me', { name: 'x' });
    expect((await getResource('/api/v1/me'))?.data).toEqual({ name: 'x' });
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + day + 1);
    expect(await getResource('/api/v1/me')).toBeUndefined();
  });
});

describe('contents', () => {
  const content = (id: string) => `/api/v1/log-files/${id}/content`;

  it('stores equal attachments once, by digest', async () => {
    await putRow('log_files', { id: 'f1', digest: 'd1' });
    await putRow('log_files', { id: 'f2', digest: 'd1' });
    await putContent(content('f1'), new Blob(['hello']));
    expect(await hasDigest('d1')).toBe(true);
    expect(await (await getContent(content('f2')))?.text()).toBe('hello');
  });

  it('keeps other content by path', async () => {
    await putContent('/api/v1/reports/r1/pdf', new Blob(['pdf']));
    expect(await (await getContent('/api/v1/reports/r1/pdf'))?.text()).toBe('pdf');
    expect(await getContent('/api/v1/reports/r2/pdf')).toBeUndefined();
  });

  it('never stores or reads content kept out', async () => {
    keepContentOut('/api/v1/reports/old/pdf');
    await putContent('/api/v1/reports/old/pdf', new Blob(['pdf']));
    expect(await getContent('/api/v1/reports/old/pdf')).toBeUndefined();
  });

  it('evicts the oldest content over 100 MB', async () => {
    const mb = (n: number) => new Blob([new Uint8Array(n * 1024 * 1024)]);
    const now = Date.now();
    const clock = vi.spyOn(Date, 'now');
    clock.mockReturnValue(now);
    await putContent('/old', mb(40));
    clock.mockReturnValue(now + 1);
    await putContent('/middle', mb(40));
    clock.mockReturnValue(now + 2);
    await putContent('/new', mb(40));
    expect(await getContent('/old')).toBeUndefined();
    expect(await getContent('/middle')).toBeDefined();
    expect(await getContent('/new')).toBeDefined();
  });
});
