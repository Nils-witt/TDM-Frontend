import { type ChangeEvent, useRef, useState } from 'react';
import { useOffline } from '@/api/connectivity';
import { useResourceCache } from '@/api/resource';
import Alert from '@/components/Alert';
import { Section, SectionHeading, SectionText, sectionStack } from '@/components/form';
import { useCatalogs } from '@/data/catalogContext';
import styles from '../shared/CatalogManager.module.scss';
import {
  bundleFileName,
  bundleSections,
  type ConfigBundle,
  exportBundle,
  type ImportPlan,
  parseBundle,
  planImport,
  runImport,
  type SectionKey,
  sectionLabel,
  sectionPaths,
  sections,
} from './configBundle';

const allSections = (): Set<SectionKey> => new Set(sections.map((s) => s.key));

// The admins' configuration as one JSON file: export it, or import one made
// on this or another instance (see configBundle.ts for what an import does).
function ConfigTransferWidget() {
  return (
    <div className={sectionStack}>
      <SectionText>
        <span className="muted">
          Moves the configuration between instances or keeps a copy of it. An import matches entries
          by name, creates the missing ones and updates the ones that differ; it never renames or
          deletes. Dashboard layouts are exported in the Layouts widget.
        </span>
      </SectionText>
      <ExportSection />
      <ImportSection />
    </div>
  );
}

function SectionChecks({
  keys,
  value,
  disabled,
  onChange,
}: {
  keys: readonly SectionKey[];
  value: ReadonlySet<SectionKey>;
  disabled?: boolean;
  onChange: (v: Set<SectionKey>) => void;
}) {
  const toggle = (key: SectionKey, on: boolean) => {
    const next = new Set(value);
    if (on) next.add(key);
    else next.delete(key);
    onChange(next);
  };
  return (
    <>
      {keys.map((key) => (
        <label key={key} className="row">
          <input
            type="checkbox"
            checked={value.has(key)}
            disabled={disabled}
            onChange={(e) => toggle(key, e.target.checked)}
          />
          {sectionLabel(key)}
        </label>
      ))}
    </>
  );
}

function ExportSection() {
  const [wanted, setWanted] = useState(allSections);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    setBusy(true);
    setError(null);
    try {
      const bundle = await exportBundle(wanted);
      const blob = new Blob([JSON.stringify(bundle, null, 2) + '\n'], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = bundleFileName();
      a.click();
      // Once the click has started the download.
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section legend="Export">
      <SectionChecks
        keys={sections.map((s) => s.key)}
        value={wanted}
        disabled={busy}
        onChange={setWanted}
      />
      <div className="row">
        <button
          type="button"
          className="btn primary"
          disabled={busy || wanted.size === 0}
          onClick={() => void download()}
        >
          {busy ? 'Exporting…' : 'Export JSON'}
        </button>
      </div>
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
    </Section>
  );
}

type Loaded = { fileName: string; bundle: ConfigBundle; available: SectionKey[] };
type Planned = Awaited<ReturnType<typeof planImport>>;
type Result = { ok: boolean; lines: string[] };

function ImportSection() {
  const catalogs = useCatalogs();
  const cache = useResourceCache();
  const offline = useOffline();
  const fileInput = useRef<HTMLInputElement>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [wanted, setWanted] = useState<Set<SectionKey>>(new Set());
  const [planned, setPlanned] = useState<Planned | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const reset = () => {
    setLoaded(null);
    setPlanned(null);
    setError(null);
  };

  const plan = async (bundle: ConfigBundle, keys: Set<SectionKey>) => {
    setPlanned(null);
    if (keys.size === 0) return;
    setBusy(true);
    try {
      setPlanned(await planImport(bundle, keys));
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const chooseFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    reset();
    setResult(null);
    try {
      const bundle = parseBundle(await file.text());
      const available = bundleSections(bundle);
      if (available.length === 0) throw new Error('The file holds no configuration');
      const keys = new Set(available);
      setLoaded({ fileName: file.name, bundle, available });
      setWanted(keys);
      await plan(bundle, keys);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const changeSections = (keys: Set<SectionKey>) => {
    setWanted(keys);
    if (loaded) void plan(loaded.bundle, keys);
  };

  const apply = async () => {
    if (!planned) return;
    const { plan: p, context } = planned;
    setBusy(true);
    setProgress(0);
    const failures = await runImport(p, context, setProgress);
    // Events reload the rest; this shows the result without waiting for them.
    const touched = new Set(p.steps.map((s) => s.section));
    const paths = [...touched].flatMap((k) => sectionPaths[k]);
    cache.reloadShown((path) => paths.some((prefix) => path.startsWith(prefix)));
    await Promise.all(
      [
        touched.has('mission_types') && catalogs.missionTypeGroups.reload(),
        touched.has('mission_types') && catalogs.missionTypes.reload(),
        touched.has('logbook_types') && catalogs.logbookTypes.reload(),
        touched.has('file_types') && catalogs.fileTypes.reload(),
      ].filter((x) => x !== false),
    );
    setBusy(false);
    const done = p.steps.length - failures.length;
    setResult({
      ok: failures.length === 0,
      lines: [
        `Imported ${loaded?.fileName ?? 'the file'}: ${done} of ${p.steps.length} changes made.`,
        ...failures.map((f) => `${sectionLabel(f.step.section)} ${f.step.label}: ${f.error}`),
      ],
    });
    reset();
  };

  return (
    <Section legend="Import">
      <div className="row">
        <button
          type="button"
          className="btn"
          disabled={busy || offline}
          onClick={() => fileInput.current?.click()}
        >
          Choose file…
        </button>
        {loaded && <span className="muted">{loaded.fileName}</span>}
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => void chooseFile(e)}
        />
      </div>
      {loaded && (
        <>
          <SectionText>
            <span className="muted">
              Exported {new Date(loaded.bundle.exported_at).toLocaleString()}. Import:
            </span>
          </SectionText>
          <SectionChecks
            keys={loaded.available}
            value={wanted}
            disabled={busy}
            onChange={changeSections}
          />
        </>
      )}
      {loaded && planned && <PlanView plan={planned.plan} />}
      {loaded && (
        <div className="row">
          <button
            type="button"
            className="btn primary"
            disabled={busy || offline || !planned || planned.plan.steps.length === 0}
            onClick={() => void apply()}
          >
            {busy && planned
              ? `Importing… ${progress} / ${planned.plan.steps.length}`
              : `Import ${planned?.plan.steps.length ?? 0} changes`}
          </button>
          <button type="button" className="btn" disabled={busy} onClick={reset}>
            Cancel
          </button>
        </div>
      )}
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {result && (
        <Alert severity={result.ok ? 'success' : 'error'} onClose={() => setResult(null)}>
          {result.lines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </Alert>
      )}
    </Section>
  );
}

function PlanView({ plan }: { plan: ImportPlan }) {
  const keys = sections
    .map((s) => s.key)
    .filter(
      (k) =>
        plan.steps.some((s) => s.section === k) ||
        plan.skipped.some((s) => s.section === k) ||
        plan.unchanged[k] !== undefined,
    );
  if (keys.length === 0) {
    return (
      <SectionText>
        <span className="muted">The selected sections are empty.</span>
      </SectionText>
    );
  }
  return (
    <>
      <SectionHeading>Changes</SectionHeading>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Section</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => {
              const steps = plan.steps.filter((s) => s.section === k);
              const skipped = plan.skipped.filter((s) => s.section === k);
              const same = plan.unchanged[k] ?? 0;
              return (
                <tr key={k}>
                  <td>{sectionLabel(k)}</td>
                  <td>
                    {steps.map((s, i) => (
                      <div key={i}>
                        {s.kind === 'create' ? 'Create' : 'Update'} {s.label}
                      </div>
                    ))}
                    {skipped.map((s, i) => (
                      <div key={`skip-${i}`} className="muted">
                        Skip {s.label}: {s.reason}
                      </div>
                    ))}
                    {same > 0 && <div className="muted">{same} unchanged</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default ConfigTransferWidget;
