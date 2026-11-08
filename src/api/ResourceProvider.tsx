import { type ReactNode, useState } from 'react';
import { createResourceCache, ResourceCacheContext } from './resource';

function ResourceProvider({ children }: { children: ReactNode }) {
  const [cache] = useState(createResourceCache);
  return <ResourceCacheContext value={cache}>{children}</ResourceCacheContext>;
}

export default ResourceProvider;
