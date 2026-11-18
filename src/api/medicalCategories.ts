import { request } from './client';
import type { EntityMeta } from './entity';
import { listFetcher } from './list';
import { useResource } from './resource';

// The admin defined list of medical categories a patient can be given. A
// category may have a parent (parent_id), so they form a tree; names are
// unique (case-insensitive) among siblings. Written with catalogs.manage.
// Not personal data, so it is kept for offline use like any resource.
export type MedicalCategory = EntityMeta & {
  id: string;
  name: string;
  // null at the top level.
  parent_id: string | null;
};

export type MedicalCategoryInput = { name: string; parent_id: string | null };

export const medicalCategoriesPath = '/api/v1/medical-categories';
const categoryPath = (id: string) => `${medicalCategoriesPath}/${encodeURIComponent(id)}`;

const fetchMedicalCategories = listFetcher<MedicalCategory>('medical_categories');

export const useMedicalCategories = () =>
  useResource<MedicalCategory[]>(medicalCategoriesPath, fetchMedicalCategories);

// Deleting is soft and refused (409) while the category has subcategories;
// patients keep a deleted category.
export const medicalCategoriesApi = {
  create: (input: MedicalCategoryInput) =>
    request<MedicalCategory>(medicalCategoriesPath, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  patch: (id: string, input: Partial<MedicalCategoryInput>) =>
    request<MedicalCategory>(categoryPath(id), { method: 'PATCH', body: JSON.stringify(input) }),
  remove: (id: string) => request<void>(categoryPath(id), { method: 'DELETE' }),
};

export type MedicalCategoryNode = { category: MedicalCategory; depth: number };

const byName = (a: MedicalCategory, b: MedicalCategory) => a.name.localeCompare(b.name);

// The categories depth first, siblings by name. A category whose parent is
// missing from the list (deleted, or a cycle the API refused but an old
// replica still holds) is shown at the top level, so none is lost.
export function medicalCategoryTree(categories: readonly MedicalCategory[]): MedicalCategoryNode[] {
  const ids = new Set(categories.map((c) => c.id));
  const children = new Map<string | null, MedicalCategory[]>();
  for (const c of categories) {
    const parent = c.parent_id !== null && ids.has(c.parent_id) ? c.parent_id : null;
    children.set(parent, [...(children.get(parent) ?? []), c]);
  }
  const out: MedicalCategoryNode[] = [];
  const seen = new Set<string>();
  const walk = (parent: string | null, depth: number) => {
    for (const c of (children.get(parent) ?? []).toSorted(byName)) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      out.push({ category: c, depth });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  // Members of a cycle are unreachable from the top level.
  for (const c of categories.toSorted(byName)) {
    if (!seen.has(c.id)) {
      seen.add(c.id);
      out.push({ category: c, depth: 0 });
      walk(c.id, 1);
    }
  }
  return out;
}

// "Trauma / Fracture / Open"; null for an ID not in the list (deleted).
export function medicalCategoryPath(
  categories: readonly MedicalCategory[],
  id: string | null | undefined,
): string | null {
  if (!id) return null;
  const byId = new Map(categories.map((c) => [c.id, c]));
  const names: string[] = [];
  const seen = new Set<string>();
  for (
    let c = byId.get(id);
    c && !seen.has(c.id);
    c = c.parent_id ? byId.get(c.parent_id) : undefined
  ) {
    seen.add(c.id);
    names.unshift(c.name);
  }
  return names.length === 0 ? null : names.join(' / ');
}

// The IDs of id and every category below it: what may not become its parent.
export function medicalCategorySubtree(
  categories: readonly MedicalCategory[],
  id: string,
): Set<string> {
  const out = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of categories) {
      if (c.parent_id !== null && out.has(c.parent_id) && !out.has(c.id)) {
        out.add(c.id);
        grew = true;
      }
    }
  }
  return out;
}
