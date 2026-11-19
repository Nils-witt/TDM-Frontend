import { describe, expect, it } from 'vitest';
import { changedPaths } from './events';
import { priorityLabel } from './messageSettings';
import { tagTextColor } from './messageTags';
import {
  acknowledgementProgress,
  addressLine,
  arrivedMessages,
  awaitsAcknowledgement,
  composeOptions,
  type Message,
  type MessageReceiver,
  messagesListPath,
} from './messages';

const rc = (id: string, kind: 'to' | 'cc', acked = false): MessageReceiver => ({
  kind,
  function: { id, name: id.toUpperCase() },
  acknowledged_at: acked ? '2026-01-01T00:00:00.000Z' : null,
  acknowledged_by: acked ? 'bob' : null,
});

const msg = (id: string, receivers: MessageReceiver[]): Message => {
  const to = receivers.filter((r) => r.kind === 'to');
  const acked = to.filter((r) => r.acknowledged_at !== null).length;
  return {
    id,
    scope: null,
    sender: { id: 'all', name: 'All permissions' },
    priority: 2,
    text: 'Need water',
    tags: [],
    receivers,
    acknowledged: acked === to.length,
    acknowledgements: { acknowledged: acked, total: to.length },
    created_at: '2026-01-01T00:00:00.000Z',
    created_by: 'alice',
    updated_at: '2026-01-01T00:00:00.000Z',
    updated_by: 'alice',
  };
};

describe('messages', () => {
  it('builds the list path', () => {
    expect(messagesListPath({ box: 'inbox' })).toBe('/api/v1/messages');
    expect(messagesListPath({ box: 'all', tag: 't', unacknowledged: true })).toBe(
      '/api/v1/messages?box=all&tag=t&unacknowledged=true',
    );
  });

  it('tells progress and who still acknowledges', () => {
    const m = msg('m', [rc('a', 'to', true), rc('b', 'to'), rc('c', 'cc')]);
    expect(acknowledgementProgress(m)).toBe('1/2');
    expect(awaitsAcknowledgement(m, 'b')).toBe(true);
    expect(awaitsAcknowledgement(m, 'a')).toBe(false);
    expect(awaitsAcknowledgement(m, 'c')).toBe(false);
    expect(awaitsAcknowledgement(m, null)).toBe(false);
    expect(addressLine(m)).toBe('All permissions → A, B (+1 CC)');
    expect(acknowledgementProgress(msg('n', [rc('a', 'to', true)]))).toBeNull();
  });

  it('finds the arrived messages', () => {
    const a = msg('a', []);
    const b = msg('b', []);
    expect(arrivedMessages(undefined, [a])).toEqual([]);
    expect(arrivedMessages([a], [b, a]).map((m) => m.id)).toEqual(['b']);
  });

  it('offers each function in one list, always-CC ones as fixed chips', () => {
    const receivers = [
      { id: 'lead', name: 'Lead', always_cc: false },
      { id: 'medic', name: 'Medic', always_cc: false },
      { id: 'log', name: 'Log', always_cc: true },
    ];
    const o = composeOptions(receivers, 'sender', ['lead'], ['medic']);
    expect(o.to.map((r) => r.id)).toEqual(['lead', 'log']);
    expect(o.cc.map((r) => r.id)).toEqual(['medic']);
    expect(o.fixedCc.map((r) => r.id)).toEqual(['log']);
    // Never for the sender itself, nor once chosen as To.
    expect(composeOptions(receivers, 'log', [], []).fixedCc).toEqual([]);
    expect(composeOptions(receivers, 'x', ['log'], []).fixedCc).toEqual([]);
  });

  it('labels priorities', () => {
    expect(priorityLabel(['Flash', 'Urgent', 'Normal', 'Low'], 1)).toBe('Flash');
    expect(priorityLabel(undefined, 3)).toBe('III');
    expect(priorityLabel(['', ' ', 'x', 'y'], 2)).toBe('II');
  });

  it('picks a readable tag text color', () => {
    expect(tagTextColor('#ffff00')).toBe('#000000');
    expect(tagTextColor('#000080')).toBe('#ffffff');
    expect(tagTextColor('nope')).toBe('#000000');
  });

  it('reloads messages on their event types', () => {
    const acked = changedPaths(['message_receivers']);
    expect(acked('/api/v1/messages?box=sent')).toBe(true);
    expect(acked('/api/v1/patients')).toBe(false);
    expect(changedPaths(['user_functions'])('/api/v1/message-receivers')).toBe(true);
    expect(changedPaths(['scopes'])('/api/v1/message-receivers')).toBe(true);
  });
});
