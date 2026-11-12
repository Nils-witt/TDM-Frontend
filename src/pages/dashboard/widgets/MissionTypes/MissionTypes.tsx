import { type ChangeEvent, useId, useRef, useState } from 'react';
import { useOffline } from '@/api/connectivity';
import { missionTypeGroupsApi, missionTypesApi } from '@/api/catalogs';
import Alert from '@/components/Alert';
import ConfirmDialog from '@/components/ConfirmDialog';
import { FieldRow, Section, SectionText, sectionStack } from '@/components/form';
import { useCatalogs } from '@/data/catalogContext';
import CatalogManager from '../shared/CatalogManager';
import {
  type Delimiter,
  delimiters,
  type ImportPlan,
  planImport,
  readRows,
  toCsv,
} from './missionTypesCsv';

// The groups first, as a type needs one.
function MissionTypesWidget() {
  const { missionTypeGroups, missionTypes } = useCatalogs();
  return (
    <div className={sectionStack}>
      <CsvActions />
      <CatalogManager
        noun="mission type group"
        heading="Mission type groups"
        entityType="mission_type_groups"
        collection={missionTypeGroups}
        api={missionTypeGroupsApi}
        deleteNote="Its mission types stay, but no new type can be put into it."
      />
      <CatalogManager
        noun="mission type"
        heading="Mission types"
        entityType="mission_types"
        collection={missionTypes}
        api={missionTypesApi}
        deleteNote="Missions given it keep it, but it is no longer offered."
        parents={{ label: 'Group', collection: missionTypeGroups }}
        describe
      />
    </div>
  );
}

type Pending = { fileName: string; plan: ImportPlan };

function CsvActions() {
  const { missionTypeGroups: groups, missionTypes: types } = useCatalogs();
  const fileInput = useRef<HTMLInputElement>(null);
  const [delimiter, setDelimiter] = useState<Delimiter>(',');
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const delimiterId = useId();
  const offline = useOffline();

  const exportCsv = () => {
    const blob = new Blob(['﻿', toCsv(groups.items, types.items, delimiter)], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mission-types-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const chooseFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setResult(null);
    try {
      const plan = planImport(readRows(await file.text()), groups.items, types.items);
      if (plan.steps.length === 0) {
        setResult({ ok: true, text: `Nothing to import: all ${plan.unchanged} rows exist.` });
      } else {
        setPending({ fileName: file.name, plan });
      }
    } catch (err) {
      setResult({ ok: false, text: (err as Error).message });
    }
  };

  const runPending = async () => {
    if (!pending) return;
    const { plan } = pending;
    setPending(null);
    setBusy(true);
    const failures = await runImport(plan);
    await Promise.all([groups.reload(), types.reload()]);
    setBusy(false);
    const done = plan.steps.length - failures.length;
    setResult(
      failures.length === 0
        ? { ok: true, text: `Imported ${done} entries; ${plan.unchanged} rows were unchanged.` }
        : {
            ok: false,
            text: `Imported ${done} of ${plan.steps.length} entries. Failed: ${failures.join('; ')}`,
          },
    );
  };

  const counts = pending && {
    groups: pending.plan.steps.filter((s) => s.kind === 'create-group').length,
    types: pending.plan.steps.filter((s) => s.kind === 'create-type').length,
    updates: pending.plan.steps.filter((s) => s.kind === 'update-type').length,
  };

  return (
    <>
      <Section legend="Import / export">
        <FieldRow id={delimiterId} label="CSV delimiter">
          <select
            id={delimiterId}
            title="Delimiter for export; import detects it"
            value={delimiter}
            onChange={(e) => setDelimiter(e.target.value as Delimiter)}
          >
            {delimiters.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          <button type="button" className="btn" onClick={exportCsv}>
            Export CSV
          </button>
          <button
            type="button"
            className="btn"
            disabled={busy || offline}
            onClick={() => fileInput.current?.click()}
          >
            {busy ? 'Importing…' : 'Import CSV'}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => void chooseFile(e)}
          />
        </FieldRow>
      </Section>
      {result && (
        <Alert severity={result.ok ? 'success' : 'error'} onClose={() => setResult(null)}>
          {result.text}
        </Alert>
      )}
      {pending && counts && (
        <ConfirmDialog
          title="Import mission types"
          message={
            <>
              <SectionText>
                Import {pending.fileName}: create {counts.groups} groups and {counts.types} mission
                types
                {counts.updates > 0 && <>, and change the description of {counts.updates}</>}?
              </SectionText>
              <SectionText>Nothing is renamed or deleted.</SectionText>
            </>
          }
          confirmLabel="Import"
          onConfirm={runPending}
          onCancel={() => setPending(null)}
        />
      )}
    </>
  );
}

// Returns what failed, by CSV line. Types of a group that could not be created
// fail too.
async function runImport(plan: ImportPlan): Promise<string[]> {
  const created = new Map<string, string>(); // group name, folded → ID
  const failures: string[] = [];
  for (const step of plan.steps) {
    try {
      if (step.kind === 'create-group') {
        const g = await missionTypeGroupsApi.create({ name: step.name });
        created.set(step.name.toLocaleLowerCase(), g.id);
      } else if (step.kind === 'update-type') {
        await missionTypesApi.patch(step.id, { description: step.description });
      } else {
        const groupId = step.groupId ?? created.get(step.groupName.toLocaleLowerCase());
        if (groupId === undefined) throw new Error(`group "${step.groupName}" was not created`);
        await missionTypesApi.create({
          name: step.name,
          group_id: groupId,
          description: step.description,
        });
      }
    } catch (err) {
      failures.push(`line ${step.row.line}: ${(err as Error).message}`);
    }
  }
  return failures;
}

export default MissionTypesWidget;
