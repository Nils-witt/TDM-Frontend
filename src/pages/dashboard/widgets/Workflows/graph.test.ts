import { describe, expect, it } from 'vitest';
import type { WorkflowCatalog, WorkflowGraph } from '@/api/workflows';
import {
  contextPaths,
  describeValue,
  fromFlow,
  leadsTo,
  newNodeID,
  summary,
  toFlow,
} from './graph';

const graph: WorkflowGraph = {
  nodes: [
    { id: 'start', kind: 'mission_created', params: {}, position: { x: 0, y: 0 } },
    { id: 'check', kind: 'status_is', params: { status: 'active' }, position: { x: 10, y: 20 } },
    { id: 'log', kind: 'add_log', params: { output_var: 'entry' }, position: { x: 30, y: 40 } },
  ],
  edges: [
    { from: 'start', port: 'next', to: 'check' },
    { from: 'check', port: 'true', to: 'log' },
  ],
};

const catalog = {
  nodes: [
    {
      kind: 'mission_created',
      category: 'trigger',
      label: 'Mission created',
      seeds: ['mission.id'],
      params: [],
    },
    { kind: 'status_is', category: 'filter', label: 'Status is', params: [] },
    { kind: 'add_log', category: 'action', label: 'Add log', output: ['id'], params: [] },
  ],
} as unknown as WorkflowCatalog;

describe('toFlow / fromFlow', () => {
  it('round-trips a graph', () => {
    const { nodes, edges } = toFlow(graph);
    expect(edges[1]).toMatchObject({ id: 'check:true', sourceHandle: 'true', label: 'yes' });
    expect(edges[0]!.label).toBeUndefined();
    expect(fromFlow(nodes, edges)).toEqual(graph);
  });

  it('rounds positions and defaults the port', () => {
    const { nodes } = toFlow(graph);
    nodes[0]!.position = { x: 1.6, y: 2.4 };
    const g = fromFlow(nodes, [{ id: 'e', source: 'start', target: 'log' }]);
    expect(g.nodes[0]!.position).toEqual({ x: 2, y: 2 });
    expect(g.edges).toEqual([{ from: 'start', port: 'next', to: 'log' }]);
  });
});

describe('leadsTo', () => {
  it('follows edges, also through cycles', () => {
    const { edges } = toFlow({
      ...graph,
      edges: [...graph.edges, { from: 'log', port: 'next', to: 'check' }],
    });
    expect(leadsTo(edges, 'start', 'log')).toBe(true);
    expect(leadsTo(edges, 'log', 'start')).toBe(false);
  });
});

it('newNodeID picks the first free number', () => {
  const { nodes } = toFlow({
    nodes: [{ id: 'add_log_1', kind: 'add_log', params: {}, position: { x: 0, y: 0 } }],
    edges: [],
  });
  expect(newNodeID(nodes, 'add_log')).toBe('add_log_2');
  expect(newNodeID(nodes, 'a.b c')).toBe('a_b_c_1');
});

it('contextPaths lists seeds, step outputs and variables', () => {
  const { nodes } = toFlow(graph);
  expect(contextPaths(catalog, nodes)).toEqual([
    'workflow.id',
    'workflow.name',
    'mission.id',
    'steps.log',
    'steps.log.error',
    'steps.log.id',
    'vars.entry',
    'vars.entry.id',
  ]);
  expect(contextPaths(catalog, nodes, 'log')).toEqual([
    'workflow.id',
    'workflow.name',
    'mission.id',
  ]);
});

it('describeValue', () => {
  expect(describeValue(undefined)).toBe('—');
  expect(describeValue({ ref: 'mission.id' })).toBe('mission.id');
  expect(describeValue({ template: 'Hi {{x}}' })).toBe('"Hi {{x}}"');
  expect(describeValue({ value: [1, 2] })).toBe('1, 2');
  expect(describeValue([])).toBe('any');
});

it('summary counts filters and actions', () => {
  expect(summary(catalog, graph)).toBe('Mission created · 1 filter · 1 action');
  expect(summary(null, { nodes: [], edges: [] })).toBe('No trigger · 0 filters · 0 actions');
});
