import {
  fileTypesApi,
  fileTypesPath,
  type CatalogEntry,
  type FileType,
  type LogbookType,
  logbookTypesApi,
  logbookTypesPath,
  type MissionType,
  type MissionTypeGroup,
  missionTypeGroupsApi,
  missionTypeGroupsPath,
  missionTypesApi,
  missionTypesPath,
} from '@/api/catalogs';
import { request } from '@/api/client';
import { fetchGroups, groupsPath } from '@/api/directory';
import {
  type ExportTemplate,
  exportTemplatesApi,
  exportTemplatesPath,
} from '@/api/exportTemplates';
import { requestAll } from '@/api/list';
import {
  type MapSettings,
  mapSettingsApi,
  mapSettingsPath,
  type MapStyle,
  mapStylesApi,
  mapStylesPath,
} from '@/api/maps';
import {
  fetchGroupPermissions,
  groupPermissionsApi,
  groupPermissionsPath,
} from '@/api/permissions';
import {
  type Workflow,
  type WorkflowCatalog,
  type WorkflowGraph,
  workflowsApi,
  workflowsPath,
} from '@/api/workflows';

// The admins' configuration of one API as a JSON file, to move it to another
// instance or keep a copy. Entries are named, never identified by ID, as IDs
// differ between instances: an import matches by name (ignoring case),
// creates what is missing and updates what differs. It never renames or
// deletes. Workflows name logbook types instead of giving their IDs, and
// permissions name their directory group.

export const bundleFormat = 'universam-config';
export const bundleVersion = 1;

export const sections = [
  { key: 'mission_types', label: 'Mission types' },
  { key: 'logbook_types', label: 'Logbook types' },
  { key: 'file_types', label: 'File types' },
  { key: 'map_styles', label: 'Map styles' },
  { key: 'map_settings', label: 'Map defaults' },
  { key: 'export_templates', label: 'Export templates' },
  { key: 'workflows', label: 'Workflows' },
  { key: 'permissions', label: 'Group permissions' },
] as const;

export type SectionKey = (typeof sections)[number]['key'];

export const sectionLabel = (key: SectionKey) => sections.find((s) => s.key === key)!.label;

export type BundleMissionTypeGroup = { name: string; types: string[] };
export type BundleMapStyle = { name: string; url: string; is_default: boolean };
export type BundleTemplate = { name: string; source: string };
export type BundleWorkflow = { name: string; enabled: boolean; graph: WorkflowGraph };
export type BundlePermissions = { group: string; permissions: string[] };

// A section left out is not part of the file and not touched by an import.
export type ConfigBundle = {
  format: typeof bundleFormat;
  version: number;
  exported_at: string;
  mission_types?: BundleMissionTypeGroup[];
  logbook_types?: string[];
  file_types?: string[];
  map_styles?: BundleMapStyle[];
  map_settings?: { default_overlays: string[] };
  export_templates?: BundleTemplate[];
  workflows?: BundleWorkflow[];
  permissions?: BundlePermissions[];
};

const fold = (s: string) => s.trim().toLocaleLowerCase();
const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
const names = (entries: readonly CatalogEntry[]) => entries.map((e) => e.name).toSorted();

// --- What the API holds ---

// Loaded fresh for every export and import plan, so neither works from a stale
// copy. The workflow catalog says which node parameters name logbook types.
type Current = {
  missionTypeGroups: MissionTypeGroup[];
  missionTypes: MissionType[];
  logbookTypes: LogbookType[];
  fileTypes: FileType[];
  mapStyles: MapStyle[];
  mapSettings: MapSettings | null;
  templates: ExportTemplate[];
  workflows: Workflow[];
  workflowCatalog: WorkflowCatalog | null;
  // Group name, folded → ID and the permissions it holds.
  groups: Map<string, { id: string; name: string; permissions: string[] }>;
};

const needs = (wanted: ReadonlySet<SectionKey>, ...keys: SectionKey[]) =>
  keys.some((k) => wanted.has(k));

async function loadCurrent(wanted: ReadonlySet<SectionKey>): Promise<Current> {
  const none = Promise.resolve([]);
  const [
    missionTypeGroups,
    missionTypes,
    logbookTypes,
    fileTypes,
    mapStyles,
    mapSettings,
    templates,
    workflows,
    workflowCatalog,
    groups,
  ] = await Promise.all([
    needs(wanted, 'mission_types')
      ? requestAll<MissionTypeGroup>(missionTypeGroupsPath, 'mission_type_groups')
      : none,
    needs(wanted, 'mission_types')
      ? requestAll<MissionType>(missionTypesPath, 'mission_types')
      : none,
    needs(wanted, 'logbook_types', 'workflows')
      ? requestAll<LogbookType>(logbookTypesPath, 'logbook_types')
      : none,
    needs(wanted, 'file_types') ? requestAll<FileType>(fileTypesPath, 'file_types') : none,
    needs(wanted, 'map_styles') ? requestAll<MapStyle>(mapStylesPath, 'map_styles') : none,
    needs(wanted, 'map_settings') ? request<MapSettings>(mapSettingsPath) : Promise.resolve(null),
    needs(wanted, 'export_templates')
      ? requestAll<ExportTemplate>(exportTemplatesPath, 'export_templates')
      : none,
    needs(wanted, 'workflows') ? requestAll<Workflow>(workflowsPath, 'workflows') : none,
    needs(wanted, 'workflows')
      ? request<WorkflowCatalog>(`${workflowsPath}/catalog`)
      : Promise.resolve(null),
    needs(wanted, 'permissions') ? loadGroupPermissions() : Promise.resolve(new Map()),
  ]);
  return {
    missionTypeGroups,
    missionTypes,
    logbookTypes,
    fileTypes,
    mapStyles,
    mapSettings,
    templates,
    workflows,
    workflowCatalog,
    groups,
  };
}

async function loadGroupPermissions(): Promise<Current['groups']> {
  const groups = await fetchGroups(groupsPath);
  const entries = await Promise.all(
    groups.map(async (g) => ({
      id: g.id,
      name: g.name,
      permissions: (await fetchGroupPermissions(groupPermissionsPath(g.id))).toSorted(),
    })),
  );
  return new Map(entries.map((e) => [fold(e.name), e]));
}

// --- Workflows: logbook type IDs ↔ names ---

// The parameter names per node kind that hold a logbook type ID.
function logbookTypeParams(catalog: WorkflowCatalog | null): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const node of catalog?.nodes ?? []) {
    const params = node.params.filter((p) => p.type === 'logbook_type').map((p) => p.name);
    if (params.length > 0) out.set(node.kind, params);
  }
  return out;
}

// Replaces each logbook type parameter's value by what map returns for it;
// map throws for a value it cannot translate.
function mapLogbookTypes(
  graph: WorkflowGraph,
  params: Map<string, string[]>,
  map: (value: string) => string,
): WorkflowGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((n) => {
      const keys = params.get(n.kind);
      if (!keys || !n.params) return n;
      const p = { ...n.params };
      for (const k of keys) {
        if (typeof p[k] === 'string' && p[k] !== '') p[k] = map(p[k]);
      }
      return { ...n, params: p };
    }),
  };
}

// Keys sorted, so equal graphs compare equal however the API ordered them.
function stableJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableJson).join(',')}]`;
  if (v && typeof v === 'object') {
    const entries = Object.entries(v as Record<string, unknown>)
      .filter(([, x]) => x !== undefined)
      .toSorted(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, x]) => `${JSON.stringify(k)}:${stableJson(x)}`).join(',')}}`;
  }
  return JSON.stringify(v);
}

// A graph as the file holds it: logbook types by name. An ID the catalog no
// longer lists stays an ID, which an import then reports.
function portableGraph(c: Current, graph: WorkflowGraph): WorkflowGraph {
  const byId = new Map(c.logbookTypes.map((t) => [t.id, t.name]));
  return mapLogbookTypes(graph, logbookTypeParams(c.workflowCatalog), (id) => byId.get(id) ?? id);
}

// --- Export ---

export async function exportBundle(wanted: ReadonlySet<SectionKey>): Promise<ConfigBundle> {
  const c = await loadCurrent(wanted);
  const bundle: ConfigBundle = {
    format: bundleFormat,
    version: bundleVersion,
    exported_at: new Date().toISOString(),
  };
  if (wanted.has('mission_types')) {
    bundle.mission_types = c.missionTypeGroups.toSorted(byName).map((g) => ({
      name: g.name,
      types: names(c.missionTypes.filter((t) => t.group_id === g.id)),
    }));
  }
  if (wanted.has('logbook_types')) bundle.logbook_types = names(c.logbookTypes);
  if (wanted.has('file_types')) bundle.file_types = names(c.fileTypes);
  if (wanted.has('map_styles')) {
    bundle.map_styles = c.mapStyles
      .toSorted(byName)
      .map(({ name, url, is_default }) => ({ name, url, is_default }));
  }
  if (wanted.has('map_settings')) {
    bundle.map_settings = { default_overlays: c.mapSettings?.default_overlays ?? [] };
  }
  if (wanted.has('export_templates')) {
    bundle.export_templates = c.templates.toSorted(byName).map(({ name, source }) => ({
      name,
      source,
    }));
  }
  if (wanted.has('workflows')) {
    bundle.workflows = c.workflows.toSorted(byName).map((w) => ({
      name: w.name,
      enabled: w.enabled,
      graph: portableGraph(c, w.graph),
    }));
  }
  if (wanted.has('permissions')) {
    bundle.permissions = [...c.groups.values()]
      .toSorted(byName)
      .filter((g) => g.permissions.length > 0)
      .map((g) => ({ group: g.name, permissions: g.permissions }));
  }
  return bundle;
}

export function bundleFileName(date = new Date()) {
  return `universam-config-${date.toISOString().slice(0, 10)}.json`;
}

// --- Reading a file ---

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === 'string';
const isStringList = (v: unknown): v is string[] => Array.isArray(v) && v.every(isString);

// Checks the shape of every section the file holds; throws naming each problem.
export function parseBundle(text: string): ConfigBundle {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('The file is not JSON');
  }
  if (!isObject(data) || data.format !== bundleFormat) {
    throw new Error('The file is not a Universam configuration export');
  }
  if (typeof data.version !== 'number' || data.version > bundleVersion) {
    throw new Error(
      `Unsupported version ${String(data.version)}; this app reads up to ${bundleVersion}`,
    );
  }

  const problems: string[] = [];
  const list = (key: SectionKey, item: (v: unknown) => boolean) => {
    const v = data[key];
    if (v === undefined) return;
    if (!Array.isArray(v)) problems.push(`${key} is not a list`);
    else {
      v.forEach((x, i) => {
        if (!item(x)) problems.push(`${key}[${i}] is invalid`);
      });
    }
  };
  const named = (x: unknown): x is Record<string, unknown> =>
    isObject(x) && isString(x.name) && x.name.trim() !== '';

  list('mission_types', (x) => named(x) && isStringList(x.types));
  list('logbook_types', (x) => isString(x) && x.trim() !== '');
  list('file_types', (x) => isString(x) && x.trim() !== '');
  list(
    'map_styles',
    (x) =>
      named(x) &&
      isString(x.url) &&
      (x.is_default === undefined || typeof x.is_default === 'boolean'),
  );
  list('export_templates', (x) => named(x) && isString(x.source));
  list(
    'workflows',
    (x) =>
      named(x) &&
      typeof x.enabled === 'boolean' &&
      isObject(x.graph) &&
      Array.isArray(x.graph.nodes) &&
      Array.isArray(x.graph.edges),
  );
  list('permissions', (x) => isObject(x) && isString(x.group) && isStringList(x.permissions));
  if (
    data.map_settings !== undefined &&
    !(isObject(data.map_settings) && isStringList(data.map_settings.default_overlays))
  ) {
    problems.push('map_settings is invalid');
  }
  if (problems.length > 0) throw new Error(`Invalid file: ${problems.join('; ')}`);
  return data as ConfigBundle;
}

export const bundleSections = (b: ConfigBundle): SectionKey[] =>
  sections.map((s) => s.key).filter((k) => b[k] !== undefined);

// --- Import ---

// What an import does, step by step, in this order: catalogs first, as
// workflows name logbook types the same import may create.
export type ImportStep = {
  section: SectionKey;
  kind: 'create' | 'update';
  label: string;
  run: (ctx: ImportContext) => Promise<void>;
};

// An entry the file names that the import leaves alone, and why.
export type ImportSkip = { section: SectionKey; label: string; reason: string };

export type ImportPlan = {
  steps: ImportStep[];
  skipped: ImportSkip[];
  unchanged: Partial<Record<SectionKey, number>>;
};

// Filled in by the steps for the ones after them.
type ImportContext = {
  // Group name, folded → ID, of the mission type groups.
  missionTypeGroups: Map<string, string>;
  // Name, folded → ID.
  logbookTypes: Map<string, string>;
};

export async function planImport(
  bundle: ConfigBundle,
  wanted: ReadonlySet<SectionKey>,
): Promise<{ plan: ImportPlan; context: ImportContext }> {
  const c = await loadCurrent(wanted);
  const steps: ImportStep[] = [];
  const skipped: ImportSkip[] = [];
  const unchanged: ImportPlan['unchanged'] = {};
  const same = (section: SectionKey) => (unchanged[section] = (unchanged[section] ?? 0) + 1);
  const context: ImportContext = {
    missionTypeGroups: new Map(c.missionTypeGroups.map((g) => [fold(g.name), g.id])),
    logbookTypes: new Map(c.logbookTypes.map((t) => [fold(t.name), t.id])),
  };

  if (wanted.has('mission_types') && bundle.mission_types) {
    const existing = new Set(c.missionTypes.map((t) => `${t.group_id}\u0000${fold(t.name)}`));
    const seenGroups = new Set<string>();
    for (const g of bundle.mission_types) {
      const groupName = g.name.trim();
      const key = fold(groupName);
      if (seenGroups.has(key)) continue;
      seenGroups.add(key);
      const groupId = context.missionTypeGroups.get(key);
      if (groupId === undefined) {
        steps.push({
          section: 'mission_types',
          kind: 'create',
          label: `group “${groupName}”`,
          run: async (ctx) => {
            const created = await missionTypeGroupsApi.create({ name: groupName });
            ctx.missionTypeGroups.set(key, created.id);
          },
        });
      } else same('mission_types');
      const seenTypes = new Set<string>();
      for (const raw of g.types) {
        const name = raw.trim();
        if (name === '' || seenTypes.has(fold(name))) continue;
        seenTypes.add(fold(name));
        if (groupId !== undefined && existing.has(`${groupId}\u0000${fold(name)}`)) {
          same('mission_types');
          continue;
        }
        steps.push({
          section: 'mission_types',
          kind: 'create',
          label: `“${groupName} / ${name}”`,
          run: async (ctx) => {
            const id = ctx.missionTypeGroups.get(key);
            if (id === undefined) throw new Error(`group “${groupName}” was not created`);
            await missionTypesApi.create({ name, group_id: id });
          },
        });
      }
    }
  }

  const catalog = (
    section: 'logbook_types' | 'file_types',
    entries: readonly CatalogEntry[],
    create: (name: string) => Promise<CatalogEntry>,
    onCreated?: (ctx: ImportContext, entry: CatalogEntry) => void,
  ) => {
    const list = bundle[section];
    if (!wanted.has(section) || !list) return;
    const existing = new Set(entries.map((e) => fold(e.name)));
    for (const raw of list) {
      const name = raw.trim();
      if (existing.has(fold(name))) {
        same(section);
        continue;
      }
      existing.add(fold(name));
      steps.push({
        section,
        kind: 'create',
        label: `“${name}”`,
        run: async (ctx) => onCreated?.(ctx, await create(name)),
      });
    }
  };
  catalog(
    'logbook_types',
    c.logbookTypes,
    (name) => logbookTypesApi.create({ name }),
    (ctx, t) => ctx.logbookTypes.set(fold(t.name), t.id),
  );
  catalog('file_types', c.fileTypes, (name) => fileTypesApi.create({ name }));

  if (wanted.has('map_styles') && bundle.map_styles) {
    const byNameFolded = new Map(c.mapStyles.map((s) => [fold(s.name), s]));
    // The file's last default wins, as the API keeps only one.
    const defaultName = bundle.map_styles.findLast((s) => s.is_default)?.name;
    const seen = new Set<string>();
    for (const s of bundle.map_styles) {
      const name = s.name.trim();
      if (seen.has(fold(name))) continue;
      seen.add(fold(name));
      const isDefault = s.name === defaultName;
      const current = byNameFolded.get(fold(name));
      if (!current) {
        steps.push({
          section: 'map_styles',
          kind: 'create',
          label: `“${name}”`,
          run: async () => {
            await mapStylesApi.create({ name, url: s.url, is_default: isDefault });
          },
        });
        continue;
      }
      // A style the file does not mark default stays default here.
      const patch = {
        ...(current.url !== s.url && { url: s.url }),
        ...(isDefault && !current.is_default && { is_default: true }),
      };
      if (Object.keys(patch).length === 0) same('map_styles');
      else {
        steps.push({
          section: 'map_styles',
          kind: 'update',
          label: `“${current.name}”`,
          run: async () => {
            await mapStylesApi.patch(current.id, patch);
          },
        });
      }
    }
  }

  if (wanted.has('map_settings') && bundle.map_settings) {
    const want = [...new Set(bundle.map_settings.default_overlays)].toSorted();
    const have = (c.mapSettings?.default_overlays ?? []).toSorted();
    if (stableJson(want) === stableJson(have)) same('map_settings');
    else {
      steps.push({
        section: 'map_settings',
        kind: 'update',
        label: `overlays on by default: ${want.length === 0 ? 'none' : want.join(', ')}`,
        run: async () => {
          await mapSettingsApi.replace({ default_overlays: want });
        },
      });
    }
  }

  if (wanted.has('export_templates') && bundle.export_templates) {
    const byNameFolded = new Map(c.templates.map((t) => [fold(t.name), t]));
    const seen = new Set<string>();
    for (const t of bundle.export_templates) {
      const name = t.name.trim();
      if (seen.has(fold(name))) continue;
      seen.add(fold(name));
      const current = byNameFolded.get(fold(name));
      if (!current) {
        steps.push({
          section: 'export_templates',
          kind: 'create',
          label: `“${name}”`,
          run: async () => {
            await exportTemplatesApi.create({ name, source: t.source });
          },
        });
      } else if (current.source === t.source) same('export_templates');
      else {
        steps.push({
          section: 'export_templates',
          kind: 'update',
          label: `“${current.name}”`,
          run: async () => {
            await exportTemplatesApi.patch(current.id, { source: t.source });
          },
        });
      }
    }
  }

  if (wanted.has('workflows') && bundle.workflows) {
    const params = logbookTypeParams(c.workflowCatalog);
    const byNameFolded = new Map(c.workflows.map((w) => [fold(w.name), w]));
    // Logbook types the file names that neither exist nor are created by
    // this import.
    const coming = new Set(context.logbookTypes.keys());
    if (wanted.has('logbook_types'))
      for (const n of bundle.logbook_types ?? []) coming.add(fold(n));
    const seen = new Set<string>();
    for (const w of bundle.workflows) {
      const name = w.name.trim();
      if (seen.has(fold(name))) continue;
      seen.add(fold(name));
      const missing = new Set<string>();
      mapLogbookTypes(w.graph, params, (n) => {
        if (!coming.has(fold(n))) missing.add(n);
        return n;
      });
      if (missing.size > 0) {
        skipped.push({
          section: 'workflows',
          label: `“${name}”`,
          reason: `names logbook types that do not exist: ${[...missing].join(', ')}`,
        });
        continue;
      }
      const resolve = (ctx: ImportContext) =>
        mapLogbookTypes(w.graph, params, (n) => {
          const id = ctx.logbookTypes.get(fold(n));
          if (id === undefined) throw new Error(`logbook type “${n}” was not created`);
          return id;
        });
      const current = byNameFolded.get(fold(name));
      if (!current) {
        steps.push({
          section: 'workflows',
          kind: 'create',
          label: `“${name}”`,
          run: async (ctx) => {
            await workflowsApi.create({ name, enabled: w.enabled, graph: resolve(ctx) });
          },
        });
      } else if (
        current.enabled === w.enabled &&
        stableJson(portableGraph(c, current.graph)) === stableJson(w.graph)
      ) {
        same('workflows');
      } else {
        steps.push({
          section: 'workflows',
          kind: 'update',
          label: `“${current.name}”`,
          run: async (ctx) => {
            await workflowsApi.patch(current.id, { enabled: w.enabled, graph: resolve(ctx) });
          },
        });
      }
    }
  }

  if (wanted.has('permissions') && bundle.permissions) {
    for (const p of bundle.permissions) {
      const group = c.groups.get(fold(p.group));
      if (!group) {
        skipped.push({
          section: 'permissions',
          label: `group “${p.group}”`,
          reason: 'not in the directory (or without members)',
        });
        continue;
      }
      const want = [...new Set(p.permissions)].toSorted();
      if (stableJson(want) === stableJson(group.permissions)) {
        same('permissions');
        continue;
      }
      steps.push({
        section: 'permissions',
        kind: 'update',
        label: `group “${group.name}”: ${want.length === 0 ? 'none' : want.join(', ')}`,
        run: async () => {
          await groupPermissionsApi.replace(group.id, want);
        },
      });
    }
  }

  return { plan: { steps, skipped, unchanged }, context };
}

// Runs every step even after one failed; returns the failures.
export async function runImport(
  plan: ImportPlan,
  context: ImportContext,
  onProgress?: (done: number) => void,
): Promise<{ step: ImportStep; error: string }[]> {
  const failures: { step: ImportStep; error: string }[] = [];
  let done = 0;
  for (const step of plan.steps) {
    try {
      await step.run(context);
    } catch (err) {
      failures.push({ step, error: (err as Error).message });
    }
    onProgress?.(++done);
  }
  return failures;
}

// The resource paths an import of these sections may change.
export const sectionPaths: Record<SectionKey, string[]> = {
  mission_types: [missionTypeGroupsPath, missionTypesPath],
  logbook_types: [logbookTypesPath],
  file_types: [fileTypesPath],
  map_styles: [mapStylesPath],
  map_settings: [mapSettingsPath],
  export_templates: [exportTemplatesPath],
  workflows: [workflowsPath],
  permissions: [groupsPath],
};
