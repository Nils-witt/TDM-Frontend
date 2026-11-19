import { describe, expect, it, vi } from 'vitest';

vi.mock('@/data/messages', () => ({ useChatEnabled: vi.fn(), useMessageAccess: vi.fn() }));

const { sendBlocker, tagsOf } = await import('./messagesState');

const access = (over: Partial<{ offline: boolean; send: boolean }> = {}) => ({
  functionId: 'f',
  view: true,
  send: true,
  viewAll: false,
  offline: false,
  load: true,
  ...over,
});

describe('sendBlocker', () => {
  it('tells why nothing can be sent', () => {
    expect(sendBlocker(access(), true)).toBeNull();
    // Unknown while the settings load: the API decides.
    expect(sendBlocker(access(), undefined)).toBeNull();
    expect(sendBlocker(access(), false)).toMatch(/disabled/);
    expect(sendBlocker(access({ send: false }), true)).toMatch(/messages.send/);
    expect(sendBlocker(access({ offline: true }), true)).toMatch(/offline/);
  });
});

describe('tagsOf', () => {
  it('keeps the order and drops unknown tags', () => {
    const t = (id: string) => ({ id, name: id }) as never;
    const byId = new Map([
      ['a', t('a')],
      ['b', t('b')],
    ]);
    const m = { tags: ['b', 'x', 'a'] } as never;
    expect(tagsOf(m, byId).map((x: { id: string }) => x.id)).toEqual(['b', 'a']);
  });
});
