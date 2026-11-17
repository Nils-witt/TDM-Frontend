import { useResource } from './resource';

// GET /api/v1/connections: the API instance's connections to the external
// services it is configured with. The units server's is its live event stream
// (reloaded on the event type `units`), the others are probed by the API every
// 30 s (event type `connections`), so neither is polled here.
export const connectionsPath = '/api/v1/connections';

// pending: not checked yet since the API started.
export type ConnectionState = 'pending' | 'connected' | 'disconnected';

export type ServiceConnection = {
  service: string;
  state: ConnectionState;
  // When the API saw the state begin.
  since: string;
  // A short reason while a probed service is disconnected; null otherwise.
  error: string | null;
};

export type ConnectionList = { connections: ServiceConnection[] };

// Not kept offline: a stored copy would show states that no longer hold.
export function useConnections() {
  return useResource<ConnectionList>(connectionsPath, undefined, { persist: false });
}

const serviceLabels: Record<string, string> = {
  units: 'Units server',
  addresses: 'Address directory',
  tiles: 'Tile server',
  pdf: 'PDF export (Gotenberg)',
};

// A service added to the API later shows its name.
export const serviceLabel = (service: string) => serviceLabels[service] ?? service;

// good: every service connected; degraded: some disconnected; failed: all
// disconnected; pending: none disconnected, some not checked yet.
export type ConnectionsLevel = 'good' | 'pending' | 'degraded' | 'failed';

export function summarizeConnections(connections: ServiceConnection[]): ConnectionsLevel {
  const down = connections.filter((c) => c.state === 'disconnected').length;
  if (down > 0) return down === connections.length ? 'failed' : 'degraded';
  return connections.some((c) => c.state === 'pending') ? 'pending' : 'good';
}
