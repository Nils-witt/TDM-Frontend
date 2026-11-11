import type { Edge, Node } from '@xyflow/react';
import type {
  WorkflowCatalog,
  WorkflowGraph,
  WorkflowNodeType,
  WorkflowValue,
} from '@/api/workflows';

export type StepData = { kind: string; params: Record<string, unknown> };

export type StepNode = Node<StepData, 'step'>;

export const portLabels: Record<string, string> = {
  next: 'then',
  true: 'yes',
  false: 'no',
  error: 'on error',
};

export const nodeType = (catalog: WorkflowCatalog | null, kind: string) =>
  catalog?.nodes.find((t) => t.kind === kind);

export function toFlow(g: WorkflowGraph): { nodes: StepNode[]; edges: Edge[] } {
  return {
    nodes: g.nodes.map((n) => ({
      id: n.id,
      type: 'step',
      position: n.position,
      data: { kind: n.kind, params: n.params ?? {} },
    })),
    edges: g.edges.map(flowEdge),
  };
}

export function flowEdge(e: { from: string; port: string; to: string }): Edge {
  return {
    id: `${e.from}:${e.port}`,
    source: e.from,
    sourceHandle: e.port,
    target: e.to,
    label: e.port === 'next' ? undefined : portLabels[e.port],
    className: `port-${e.port}`,
  };
}

export function fromFlow(nodes: StepNode[], edges: Edge[]): WorkflowGraph {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      kind: n.data.kind,
      params: n.data.params,
      position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
    })),
    edges: edges.map((e) => ({ from: e.source, port: e.sourceHandle ?? 'next', to: e.target })),
  };
}

export function leadsTo(edges: Edge[], from: string, to: string): boolean {
  const seen = new Set<string>();
  const stack = [from];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (id === to) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const e of edges) if (e.source === id) stack.push(e.target);
  }
  return false;
}

export function newNodeID(nodes: StepNode[], kind: string): string {
  const base = kind.replace(/[^A-Za-z0-9_-]/g, '_');
  const used = new Set(nodes.map((n) => n.id));
  for (let i = 1; ; i++) {
    const id = `${base}_${i}`;
    if (!used.has(id)) return id;
  }
}

// The trigger's seeds, the output of the other actions and the variables they
// set.
export function contextPaths(
  catalog: WorkflowCatalog | null,
  nodes: StepNode[],
  except?: string,
): string[] {
  const paths: string[] = ['workflow.id', 'workflow.name'];
  for (const n of nodes) {
    const t = nodeType(catalog, n.data.kind);
    if (!t) continue;
    if (t.category === 'trigger') paths.push(...(t.seeds ?? []));
    if (t.category !== 'action' || n.id === except) continue;
    paths.push(`steps.${n.id}`, `steps.${n.id}.error`);
    paths.push(...(t.output ?? []).map((p) => `steps.${n.id}.${p}`));
    const out = n.data.params.output_var ?? (n.data.kind === 'set_variable' && n.data.params.name);
    if (typeof out === 'string' && out !== '') {
      paths.push(`vars.${out}`, ...(t.output ?? []).map((p) => `vars.${out}.${p}`));
    }
  }
  return [...new Set(paths)];
}

// Falls back to the default.
export function paramValue(t: WorkflowNodeType, params: Record<string, unknown>, name: string) {
  if (name in params) return params[name];
  return t.params.find((p) => p.name === name)?.default;
}

export function describeValue(v: unknown): string {
  if (v === undefined || v === null) return '—';
  if (typeof v === 'object' && !Array.isArray(v)) {
    const wv = v as WorkflowValue;
    if (wv.ref !== undefined) return wv.ref;
    if (wv.template !== undefined) return `"${wv.template}"`;
    return describeValue(wv.value);
  }
  if (Array.isArray(v)) return v.length === 0 ? 'any' : v.map(String).join(', ');
  return String(v);
}

// The trigger and how many filters and actions follow it.
export function summary(catalog: WorkflowCatalog | null, g: WorkflowGraph): string {
  let trigger = '';
  let filters = 0;
  let actions = 0;
  for (const n of g.nodes) {
    const t = nodeType(catalog, n.kind);
    if (t?.category === 'trigger') trigger = t.label;
    else if (t?.category === 'filter') filters++;
    else if (t?.category === 'action') actions++;
  }
  const count = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;
  return `${trigger || 'No trigger'} · ${count(filters, 'filter')} · ${count(actions, 'action')}`;
}
