import { describe, expect, it } from 'vitest';
import { forgetSession, storedSessionId, storeSession } from './sessions';

describe('stored session', () => {
  it('belongs to its user', () => {
    storeSession({ username: 'Alice', sub: 'a' }, 's1');
    expect(storedSessionId()).toBe('s1');
    expect(storedSessionId({ username: 'alice', sub: 'a' })).toBe('s1');
    expect(storedSessionId({ username: 'bob', sub: 'b' })).toBeNull();
    forgetSession();
    expect(storedSessionId()).toBeNull();
  });
});
