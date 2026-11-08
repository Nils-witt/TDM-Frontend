import { useState } from 'react';
import { request } from './client';
import { useErrorState, useResource, useResourceCache } from './resource';

export function useSetting<T>(path: string | null, onSaved?: () => void) {
  const cache = useResourceCache();
  const { data, error: loadError } = useResource<T>(path);
  const [error, setError] = useErrorState(loadError);
  const [saved, setSaved] = useState(false);

  const save = async (value: T) => {
    if (path === null) return;
    try {
      cache.put(path, await request<T>(path, { method: 'PUT', body: JSON.stringify(value) }));
      setError(null);
      setSaved(true);
      onSaved?.();
    } catch (err) {
      setError((err as Error).message);
      setSaved(false);
    }
  };

  return { data: data ?? null, error, setError, saved, setSaved, save };
}
