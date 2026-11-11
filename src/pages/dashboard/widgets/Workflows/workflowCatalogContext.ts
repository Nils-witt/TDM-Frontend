import { createContext, use } from 'react';
import type { WorkflowCatalog } from '@/api/workflows';

// The node views read the catalog through it, as React Flow renders them
// without props of the editor's.
export const WorkflowCatalogContext = createContext<WorkflowCatalog | null>(null);

export function useWorkflowCatalog(): WorkflowCatalog {
  const v = use(WorkflowCatalogContext);
  if (!v) throw new Error('useWorkflowCatalog outside of WorkflowCatalogContext');
  return v;
}
