import { useCollection } from './collection';
import { request } from './client';
import type { EntityMeta } from './entity';
import { listFetcher } from './list';
import { useResource } from './resource';

// ref takes the value at a context path; template replaces each "{{path}}" with
// the value at path; otherwise value is literal.
export type WorkflowValue = { value?: unknown; ref?: string; template?: string };

export type WorkflowPosition = { x: number; y: number };

// A trigger, filter or action of the catalog kind (see WorkflowNodeType).
export type WorkflowGraphNode = {
  id: string;
  kind: string;
  params?: Record<string, unknown>;
  position: WorkflowPosition;
};

export type WorkflowEdge = { from: string; port: string; to: string };

// One trigger, then filters going on at "true" or "false" and actions at "next"
// or, when they fail, "error". The edges form no cycle.
export type WorkflowGraph = { nodes: WorkflowGraphNode[]; edges: WorkflowEdge[] };

// The API runs a workflow on its own when its trigger happens; what it changes
// is recorded as made by "workflow:<name>". Admins only.
export type Workflow = EntityMeta & {
  id: string;
  name: string;
  enabled: boolean;
  graph: WorkflowGraph;
};

export type WorkflowInput = Pick<Workflow, 'name' | 'enabled' | 'graph'>;

export type WorkflowNodeCategory = 'trigger' | 'filter' | 'action';

export type WorkflowParamType =
  | 'text'
  | 'template'
  | 'bool'
  | 'value'
  | 'number'
  | 'mission_status'
  | 'mission_statuses'
  | 'logbook_type'
  | 'compare_op'
  | 'name';

export type WorkflowParamSpec = {
  name: string;
  label: string;
  type: WorkflowParamType;
  required?: boolean;
  default?: unknown;
  help?: string;
};

// seeds are the context paths a trigger seeds; output those of an action's
// output below steps.<node id>.
export type WorkflowNodeType = {
  kind: string;
  category: WorkflowNodeCategory;
  label: string;
  description: string;
  ports: string[];
  params: WorkflowParamSpec[];
  seeds?: string[];
  output?: string[];
};

export type WorkflowCatalog = { nodes: WorkflowNodeType[]; compare_ops: string[] };

export const workflowsPath = '/api/v1/workflows';

const workflowPath = (id: string) => `${workflowsPath}/${encodeURIComponent(id)}`;

const fetchWorkflows = listFetcher<Workflow>('workflows');

// Newest first.
export const useWorkflows = () => useCollection(workflowsPath, fetchWorkflows);

// null while loading.
export function useWorkflowCatalog() {
  const { data, error } = useResource<WorkflowCatalog>(`${workflowsPath}/catalog`);
  return { catalog: data ?? null, error };
}

// The API validates the graph and returns it with every node's parameters in
// their canonical form, defaults included.
export const workflowsApi = {
  create: (input: WorkflowInput) =>
    request<Workflow>(workflowsPath, { method: 'POST', body: JSON.stringify(input) }),
  patch: (id: string, input: Partial<WorkflowInput>) =>
    request<Workflow>(workflowPath(id), { method: 'PATCH', body: JSON.stringify(input) }),
  remove: (id: string) => request<void>(workflowPath(id), { method: 'DELETE' }),
};
