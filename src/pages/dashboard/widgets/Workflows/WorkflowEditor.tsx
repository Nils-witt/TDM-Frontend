import { type FormEvent, useCallback, useId, useMemo, useState } from 'react';
import {
  addEdge,
  Background,
  type Connection,
  Controls,
  type Edge,
  type IsValidConnection,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type {
  Workflow,
  WorkflowCatalog,
  WorkflowGraph,
  WorkflowInput,
  WorkflowNodeCategory,
  WorkflowNodeType,
} from '@/api/workflows';
import { FieldRow, Section, SectionText, WidgetForm } from '@/components/form';
import { FormActionBar } from '../shared/WidgetActionBar';
import {
  contextPaths,
  flowEdge,
  fromFlow,
  leadsTo,
  newNodeID,
  nodeType,
  type StepNode,
  toFlow,
} from './graph';
import { NodeParams } from './NodeParams';
import { StepNodeView } from './StepNodeView';
import { WorkflowCatalogContext } from './workflowCatalogContext';
import styles from './Workflows.module.scss';

const nodeTypes = { step: StepNodeView };

// A mission status trigger alone.
const blankGraph: WorkflowGraph = {
  nodes: [{ id: 'trigger', kind: 'mission_status_changed', params: {}, position: { x: 0, y: 0 } }],
  edges: [],
};

const paletteGroups: { category: WorkflowNodeCategory; label: string; help: string }[] = [
  { category: 'trigger', label: 'When', help: 'Replaces the trigger.' },
  { category: 'filter', label: 'If', help: 'Goes on at yes or no.' },
  { category: 'action', label: 'Do', help: 'Goes on at then, or on error.' },
];

type Props = {
  // null for a new one.
  workflow: Workflow | null;
  catalog: WorkflowCatalog;
  readOnly: boolean;
  onSave: (input: WorkflowInput) => Promise<void>;
  onCancel: () => void;
};

// Dragging from a node's port to another node connects them.
export function WorkflowEditor(props: Props) {
  return (
    <ReactFlowProvider>
      <Editor {...props} />
    </ReactFlowProvider>
  );
}

function Editor({ workflow, catalog, readOnly, onSave, onCancel }: Props) {
  // The trigger is replaced, not deleted.
  const initial = useMemo(() => {
    const flowGraph = toFlow(workflow?.graph ?? blankGraph);
    flowGraph.nodes = flowGraph.nodes.map((n) =>
      nodeType(catalog, n.data.kind)?.category === 'trigger' ? { ...n, deletable: false } : n,
    );
    return flowGraph;
  }, [workflow, catalog]);
  const [name, setName] = useState(workflow?.name ?? '');
  const [enabled, setEnabled] = useState(workflow?.enabled ?? true);
  const [nodes, setNodes, onNodesChange] = useNodesState<StepNode>(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const flow = useReactFlow();
  const id = useId();

  const trigger = nodes.find((n) => nodeType(catalog, n.data.kind)?.category === 'trigger');
  const selectedNode = nodes.find((n) => n.id === selected);
  const selectedType = selectedNode && nodeType(catalog, selectedNode.data.kind);
  const paths = useMemo(
    () => contextPaths(catalog, nodes, selected ?? undefined),
    [catalog, nodes, selected],
  );

  // A port has one edge, which leads neither back to where it came from nor to
  // the trigger.
  const isValidConnection = useCallback<IsValidConnection>(
    (c) => c.source !== c.target && c.target !== trigger?.id && !leadsTo(edges, c.target, c.source),
    [edges, trigger],
  );

  const onConnect = useCallback(
    (c: Connection) =>
      setEdges((es) =>
        addEdge(
          flowEdge({ from: c.source, port: c.sourceHandle ?? 'next', to: c.target }),
          es.filter((e) => !(e.source === c.source && e.sourceHandle === c.sourceHandle)),
        ),
      ),
    [setEdges],
  );

  // Near the top left of the view; a trigger replaces the trigger.
  const add = (t: WorkflowNodeType) => {
    if (t.category === 'trigger' && trigger) {
      setNodes((ns) =>
        ns.map((n) => (n.id === trigger.id ? { ...n, data: { kind: t.kind, params: {} } } : n)),
      );
      setSelected(trigger.id);
      return;
    }
    const nodeId = newNodeID(nodes, t.kind);
    const { x, y, zoom } = flow.getViewport();
    const position = {
      x: (40 - x) / zoom + nodes.length * 12,
      y: (40 - y) / zoom + nodes.length * 12,
    };
    setNodes((ns) => [
      ...ns,
      { id: nodeId, type: 'step', position, data: { kind: t.kind, params: {} } },
    ]);
    setSelected(nodeId);
  };

  const setParams = (nodeId: string, params: Record<string, unknown>) =>
    setNodes((ns) => ns.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, params } } : n)));

  const remove = (nodeId: string) => {
    setNodes((ns) => ns.filter((n) => n.id !== nodeId));
    setEdges((es) => es.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelected(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || readOnly) return;
    setBusy(true);
    try {
      await onSave({ name: name.trim(), enabled, graph: fromFlow(nodes, edges) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <WorkflowCatalogContext value={catalog}>
      <WidgetForm id={id} className={styles.fit} onSubmit={(e) => void submit(e)}>
        <FormActionBar
          label="Workflow"
          form={id}
          submitLabel={workflow ? 'Save' : 'Add'}
          canSubmit={!readOnly && name.trim() !== '' && trigger !== undefined}
          busy={busy}
          onDiscard={onCancel}
          discardLabel="Cancel"
        />
        <Section legend={workflow ? `Edit ${workflow.name}` : 'New workflow'}>
          <FieldRow id={`${id}-name`} label="Name" marked>
            <input
              id={`${id}-name`}
              className="grow"
              value={name}
              maxLength={200}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </FieldRow>
          <FieldRow id={`${id}-enabled`} label="Enabled">
            <input
              id={`${id}-enabled`}
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
          </FieldRow>
        </Section>
        <div className={styles.editor}>
          <nav className={styles.palette} aria-label="Add a node">
            {paletteGroups.map((g) => (
              <div key={g.category} className={styles.paletteGroup}>
                <div className={styles.paletteHead} title={g.help}>
                  {g.label}
                </div>
                {catalog.nodes
                  .filter((t) => t.category === g.category)
                  .map((t) => (
                    <button
                      key={t.kind}
                      type="button"
                      className={`${styles.paletteItem} ${styles[t.category]}`}
                      title={t.description}
                      onClick={() => add(t)}
                    >
                      {t.label}
                    </button>
                  ))}
              </div>
            ))}
          </nav>
          <div className={styles.canvas}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              isValidConnection={isValidConnection}
              onNodeClick={(_, n) => setSelected(n.id)}
              onPaneClick={() => setSelected(null)}
              onNodesDelete={(ns) => {
                if (ns.some((n) => n.id === selected)) setSelected(null);
              }}
              deleteKeyCode={['Backspace', 'Delete']}
              colorMode="system"
              fitView
              fitViewOptions={{ maxZoom: 1 }}
              proOptions={{ hideAttribution: true }}
            >
              <Background />
              <Controls showInteractive={false} />
            </ReactFlow>
          </div>
          <aside className={styles.panel}>
            {selectedNode && selectedType ? (
              <NodeParams
                key={selectedNode.id}
                id={selectedNode.id}
                t={selectedType}
                params={selectedNode.data.params}
                catalog={catalog}
                paths={paths}
                onChange={(p) => setParams(selectedNode.id, p)}
                onDelete={
                  selectedType.category === 'trigger' ? undefined : () => remove(selectedNode.id)
                }
              />
            ) : (
              <Section legend="How it works">
                <SectionText>
                  The workflow starts at its trigger. A filter goes on at <em>yes</em> or{' '}
                  <em>no</em>, an action at <em>then</em> or, if it fails, at <em>on error</em>; the
                  run ends at a port without an edge.
                </SectionText>
                <SectionText>
                  Every run carries a context: <code>trigger.*</code> is what started it,{' '}
                  <code>steps.&lt;node&gt;</code> the output of each action, and <code>vars.*</code>{' '}
                  the variables set. Parameters take a context value, a text template with{' '}
                  <code>{'{{path}}'}</code> in it, or a fixed value.
                </SectionText>
                <SectionText>
                  Add nodes from the left, drag from a port to a node to connect them, select a node
                  to edit it, and press Delete to remove a node or edge. Nodes the trigger does not
                  lead to are kept as drafts and never run.
                </SectionText>
              </Section>
            )}
          </aside>
        </div>
      </WidgetForm>
    </WorkflowCatalogContext>
  );
}
