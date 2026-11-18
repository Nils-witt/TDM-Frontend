import { describe, expect, it } from 'vitest';
import { type TransportRequest, isTransportOpen, transportBlocker } from './transports';

const request = (status: TransportRequest['mission']['status']) =>
  ({ mission: { status } }) as TransportRequest;
const arrived = { uhs: { arrived_at: '2026-11-18T10:00:00.000Z' } };
const ok = { canEdit: true, offline: false };

describe('transports', () => {
  it('counts a request open until its mission is done or closed', () => {
    expect(isTransportOpen(request('open'))).toBe(true);
    expect(isTransportOpen(request('in-progress'))).toBe(true);
    expect(isTransportOpen(request('done'))).toBe(false);
    expect(isTransportOpen(request('closed'))).toBe(false);
  });

  it('allows a request for an arrived patient without an open one', () => {
    expect(transportBlocker(arrived, null, ok)).toBeNull();
    expect(transportBlocker(arrived, request('done'), ok)).toBeNull();
    expect(transportBlocker(arrived, request('open'), ok)).toMatch(/already/);
    expect(transportBlocker({ uhs: { arrived_at: null } }, null, ok)).toMatch(/arrived/);
    expect(transportBlocker({ uhs: null }, null, ok)).toMatch(/no UHS/);
    expect(transportBlocker(arrived, undefined, ok)).not.toBeNull();
    expect(transportBlocker(arrived, null, { canEdit: false, offline: false })).toMatch(
      /patients\.edit/,
    );
    expect(transportBlocker(arrived, null, { canEdit: true, offline: true })).toMatch(/offline/);
  });
});
