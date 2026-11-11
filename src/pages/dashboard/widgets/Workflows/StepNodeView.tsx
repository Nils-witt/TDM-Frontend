import { Handle, type NodeProps, Position } from '@xyflow/react';
import { useWorkflowCatalog } from './workflowCatalogContext';
import { describeValue, nodeType, paramValue, portLabels, type StepNode } from './graph';
import styles from './Workflows.module.scss';

const categoryLabels = { trigger: 'When', filter: 'If', action: 'Do' } as const;

// An input on the left (none for the trigger) and an output on the right per
// port.
export function StepNodeView({ id, data, selected }: NodeProps<StepNode>) {
  const catalog = useWorkflowCatalog();
  const t = nodeType(catalog, data.kind);
  const category = t?.category ?? 'action';
  const shown = (t?.params ?? []).filter((p) => p.name !== 'output_var').slice(0, 3);
  return (
    <div
      className={`${styles.node} ${styles[category]} ${selected ? styles.selected : ''}`}
      title={t?.description}
    >
      {category !== 'trigger' && <Handle type="target" position={Position.Left} />}
      <div className={styles.nodeHead}>
        <span className={styles.category}>{categoryLabels[category]}</span>
        <span className={styles.nodeLabel}>{t?.label ?? data.kind}</span>
      </div>
      {t && shown.length > 0 && (
        <dl className={styles.nodeParams}>
          {shown.map((p) => (
            <div key={p.name}>
              <dt>{p.label}</dt>
              <dd>{describeValue(paramValue(t, data.params, p.name))}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className={styles.nodeId}>{id}</div>
      {(t?.ports ?? []).map((port, i, ports) => (
        <Handle
          key={port}
          id={port}
          type="source"
          position={Position.Right}
          className={styles[`handle-${port}`]}
          style={{ top: `${((i + 1) * 100) / (ports.length + 1)}%` }}
        >
          {ports.length > 1 && <span className={styles.portLabel}>{portLabels[port]}</span>}
        </Handle>
      ))}
    </div>
  );
}
