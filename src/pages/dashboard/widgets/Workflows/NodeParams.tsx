import { type ReactNode, useId } from 'react';
import { type MissionStatus, missionStatuses } from '@/api/missions';
import { fmsStatusLabels } from '@/api/units';
import type {
  WorkflowCatalog,
  WorkflowNodeType,
  WorkflowParamSpec,
  WorkflowValue,
} from '@/api/workflows';
import { FieldRow, Section, SectionText } from '@/components/form';
import { DeleteIcon } from '@/components/icons';
import { useCatalogs } from '@/data/catalogContext';
import { paramValue } from './graph';
import styles from './Workflows.module.scss';

const fmsStatusOptions = Object.entries(fmsStatusLabels).map(([code, label]) => ({
  value: Number(code),
  label: `${code} ${label}`,
}));

const compareOpLabels: Record<string, string> = {
  eq: 'equals',
  ne: 'does not equal',
  lt: 'is less than',
  le: 'is at most',
  gt: 'is greater than',
  ge: 'is at least',
  in: 'is one of',
  not_in: 'is none of',
  contains: 'contains',
  empty: 'is empty',
  not_empty: 'is not empty',
};

// paths are the context paths the node may refer to.
export function NodeParams({
  id,
  t,
  params,
  catalog,
  paths,
  onChange,
  onDelete,
}: {
  id: string;
  t: WorkflowNodeType;
  params: Record<string, unknown>;
  catalog: WorkflowCatalog;
  paths: string[];
  onChange: (params: Record<string, unknown>) => void;
  onDelete?: () => void;
}) {
  const base = useId();
  const listId = `${base}-paths`;

  const set = (name: string, v: unknown) => {
    const next = { ...params };
    if (v === undefined) delete next[name];
    else next[name] = v;
    onChange(next);
  };

  return (
    <Section legend={t.label}>
      <SectionText>{t.description}</SectionText>
      <SectionText>
        Node <code>{id}</code>
        {t.category === 'action' && (
          <>
            {' '}
            · output at <code>steps.{id}</code>
          </>
        )}
      </SectionText>
      <datalist id={listId}>
        {paths.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
      {t.params.map((p) => (
        <ParamField
          key={p.name}
          id={`${base}-${p.name}`}
          spec={p}
          category={t.category}
          value={paramValue(t, params, p.name)}
          compareOps={catalog.compare_ops}
          listId={listId}
          paths={paths}
          onChange={(v) => set(p.name, v)}
        />
      ))}
      {onDelete && (
        <div className="row">
          <button type="button" className="btn" onClick={onDelete}>
            <DeleteIcon /> Remove node
          </button>
        </div>
      )}
    </Section>
  );
}

function ParamField({
  id,
  spec,
  category,
  value,
  compareOps,
  listId,
  paths,
  onChange,
}: {
  id: string;
  spec: WorkflowParamSpec;
  category: WorkflowNodeType['category'];
  value: unknown;
  compareOps: string[];
  listId: string;
  paths: string[];
  onChange: (v: unknown) => void;
}) {
  const row = (input: ReactNode) => (
    <>
      <FieldRow id={id} label={spec.label} marked={spec.required} wrapLabel>
        {input}
      </FieldRow>
      {spec.help && <SectionText>{spec.help}</SectionText>}
    </>
  );

  switch (spec.type) {
    case 'bool':
      return row(
        <input
          id={id}
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
        />,
      );
    case 'number':
      return row(
        <input
          id={id}
          type="number"
          step={1}
          min={0}
          value={typeof value === 'number' ? value : ''}
          // Empty is not set.
          onChange={(e) =>
            onChange(e.target.value === '' ? undefined : Math.trunc(Number(e.target.value)))
          }
        />,
      );
    case 'logbook_type':
      return row(
        <LogbookTypeSelect
          id={id}
          value={typeof value === 'string' ? value : ''}
          onChange={onChange}
        />,
      );
    case 'mission_status': {
      // An action cannot return a mission to draft.
      const options = missionStatuses.filter((s) => category !== 'action' || s.value !== 'draft');
      return row(
        <select id={id} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
          {options.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>,
      );
    }
    case 'mission_statuses':
      return row(
        <CheckList<MissionStatus>
          id={id}
          options={missionStatuses}
          value={(value as MissionStatus[] | null | undefined) ?? []}
          onChange={onChange}
        />,
      );
    case 'fms_statuses':
      return row(
        <CheckList<number>
          id={id}
          options={fmsStatusOptions}
          value={(value as number[] | null | undefined) ?? []}
          onChange={onChange}
        />,
      );
    case 'compare_op':
      return row(
        <select id={id} value={String(value ?? 'eq')} onChange={(e) => onChange(e.target.value)}>
          {compareOps.map((op) => (
            <option key={op} value={op}>
              {compareOpLabels[op] ?? op}
            </option>
          ))}
        </select>,
      );
    case 'value':
      return row(
        <ValueField
          id={id}
          value={(value as WorkflowValue | undefined) ?? {}}
          listId={listId}
          paths={paths}
          onChange={onChange}
        />,
      );
    case 'template':
      return row(
        <TemplateField
          id={id}
          value={typeof value === 'string' ? value : ''}
          paths={paths}
          // An optional template left empty is not set.
          onChange={(v) => onChange(v === '' && !spec.required ? undefined : v)}
        />,
      );
    default:
      return row(
        <input
          id={id}
          className="grow"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value)}
        />,
      );
  }
}

// Empty is free text.
function LogbookTypeSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (v: string | undefined) => void;
}) {
  const { logbookTypes } = useCatalogs();
  const types = logbookTypes.items.toSorted((a, b) => a.name.localeCompare(b.name));
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value || undefined)}>
      <option value="">Free text</option>
      {value !== '' && !logbookTypes.byId.has(value) && <option value={value}>Deleted type</option>}
      {types.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  );
}

// None picked is shown as any.
function CheckList<T extends string | number>({
  id,
  options,
  value,
  onChange,
}: {
  id: string;
  options: readonly { value: T; label: string }[];
  value: T[];
  onChange: (v: T[]) => void;
}) {
  return (
    <div className={styles.checkList}>
      {options.map((o, i) => (
        <label key={String(o.value)} className="row">
          <input
            id={i === 0 ? id : undefined}
            type="checkbox"
            checked={value.includes(o.value)}
            onChange={(e) =>
              onChange(e.target.checked ? [...value, o.value] : value.filter((v) => v !== o.value))
            }
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

// "{{path}}" is replaced by the value at path; the select inserts one.
function TemplateField({
  id,
  value,
  paths,
  onChange,
}: {
  id: string;
  value: string;
  paths: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className={styles.valueField}>
      <input id={id} className="grow" value={value} onChange={(e) => onChange(e.target.value)} />
      <PathInsert paths={paths} onInsert={(p) => onChange(`${value}{{${p}}}`)} />
    </div>
  );
}

function PathInsert({ paths, onInsert }: { paths: string[]; onInsert: (path: string) => void }) {
  return (
    <select
      aria-label="Insert a value"
      value=""
      onChange={(e) => {
        if (e.target.value) onInsert(e.target.value);
      }}
    >
      <option value="">Insert…</option>
      {paths.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </select>
  );
}

type ValueMode = 'ref' | 'template' | 'value';

// A context path, a template or a fixed value (see parseLiteral).
function ValueField({
  id,
  value,
  listId,
  paths,
  onChange,
}: {
  id: string;
  value: WorkflowValue;
  listId: string;
  paths: string[];
  onChange: (v: WorkflowValue | undefined) => void;
}) {
  const mode: ValueMode =
    value.ref !== undefined ? 'ref' : value.template !== undefined ? 'template' : 'value';

  const setMode = (m: ValueMode) => {
    const text =
      mode === 'ref' ? value.ref : mode === 'template' ? value.template : literalText(value.value);
    if (m === 'ref') onChange({ ref: text ?? '' });
    else if (m === 'template') onChange({ template: text ?? '' });
    else onChange({ value: parseLiteral(text ?? '') });
  };

  return (
    <div className={styles.valueField}>
      <select
        aria-label="Kind of value"
        value={mode}
        onChange={(e) => setMode(e.target.value as ValueMode)}
      >
        <option value="ref">Context value</option>
        <option value="template">Text template</option>
        <option value="value">Fixed value</option>
      </select>
      {mode === 'ref' && (
        <input
          id={id}
          className="grow"
          list={listId}
          placeholder="trigger.mission"
          value={value.ref ?? ''}
          onChange={(e) => onChange({ ref: e.target.value })}
        />
      )}
      {mode === 'template' && (
        <TemplateField
          id={id}
          value={value.template ?? ''}
          paths={paths}
          onChange={(t) => onChange({ template: t })}
        />
      )}
      {mode === 'value' && (
        <input
          id={id}
          className="grow"
          value={literalText(value.value)}
          onChange={(e) =>
            onChange(e.target.value === '' ? undefined : { value: parseLiteral(e.target.value) })
          }
        />
      )}
    </div>
  );
}

// The text parseLiteral reads back.
function literalText(v: unknown): string {
  if (v === undefined) return '';
  if (typeof v === 'string') return v;
  return JSON.stringify(v);
}

// A number, true, false, null or a JSON list or map where it is one, else text.
function parseLiteral(text: string): unknown {
  const trimmed = text.trim();
  if (/^(-?\d+(\.\d+)?|true|false|null)$/.test(trimmed) || /^[[{]/.test(trimmed)) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return text;
    }
  }
  return text;
}
