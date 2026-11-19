import { useResource } from './resource';

// GET /api/version: the universalGoApi build.
export const apiVersionPath = '/api/version';

export type BuildInfo = {
  // The release tag, "dev" when unknown.
  version: string;
  commit: string;
  commit_time: string;
  build_time: string;
  modified: boolean;
  go_version: string;
};

// Kept offline, so the About dialog shows the last known API build.
export function useApiVersion() {
  return useResource<BuildInfo>(apiVersionPath);
}

// A build as shown: its release, else its short commit.
export function buildLabel(version: string, commit: string): string {
  const v = version.trim();
  if (v !== '' && v !== 'dev' && v !== '0.0.0') return v;
  return commit ? commit.slice(0, 7) : v || 'unknown';
}
