import { describe, expect, it } from 'vitest';
import { type ConnectionState, serviceLabel, summarizeConnections } from './connections';

const conn = (service: string, state: ConnectionState) => ({
  service,
  state,
  since: '2026-11-17T12:00:00.000Z',
  error: state === 'disconnected' ? 'unreachable' : null,
});

describe('summarizeConnections', () => {
  it('is good when every service is connected', () => {
    expect(summarizeConnections([conn('units', 'connected'), conn('pdf', 'connected')])).toBe(
      'good',
    );
  });

  it('is pending while a service is not checked yet', () => {
    expect(summarizeConnections([conn('units', 'connected'), conn('pdf', 'pending')])).toBe(
      'pending',
    );
  });

  it('is degraded when some are disconnected, failed when all are', () => {
    expect(summarizeConnections([conn('units', 'connected'), conn('pdf', 'disconnected')])).toBe(
      'degraded',
    );
    expect(summarizeConnections([conn('pdf', 'pending'), conn('tiles', 'disconnected')])).toBe(
      'degraded',
    );
    expect(summarizeConnections([conn('units', 'disconnected')])).toBe('failed');
  });
});

describe('serviceLabel', () => {
  it('names known services and falls back to the name', () => {
    expect(serviceLabel('units')).toBe('Units server');
    expect(serviceLabel('mail')).toBe('mail');
  });
});
