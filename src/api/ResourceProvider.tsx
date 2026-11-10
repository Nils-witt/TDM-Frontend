import { type ReactNode, useState } from 'react';
import { createReplica, ReplicaContext } from './replica';
import { createResourceCache, ResourceCacheContext } from './resource';

function ResourceProvider({ children }: { children: ReactNode }) {
  const [cache] = useState(() => createResourceCache({ persist: true }));
  const [replica] = useState(createReplica);
  return (
    <ResourceCacheContext value={cache}>
      <ReplicaContext value={replica}>{children}</ReplicaContext>
    </ResourceCacheContext>
  );
}

export default ResourceProvider;
