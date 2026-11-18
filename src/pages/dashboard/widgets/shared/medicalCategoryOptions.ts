import { useMemo } from 'react';
import { medicalCategoryTree, useMedicalCategories } from '@/api/medicalCategories';

export type MedicalCategoryOption = { value: string; label: string; depth: number };

// The choices of a patient's medical category, shared by PatientForm and
// PatientFormMUI: None, then the tree depth first. current, the patient's
// category, stays choosable as "(deleted)" once it is gone from the list, so
// opening the form does not change it.
export function useMedicalCategoryOptions(current: string): {
  options: MedicalCategoryOption[];
  error: string | null;
} {
  const { data, error } = useMedicalCategories();
  const options = useMemo(() => {
    const tree = medicalCategoryTree(data ?? []);
    const out: MedicalCategoryOption[] = [{ value: '', label: 'None', depth: 0 }];
    if (current !== '' && data && !tree.some((n) => n.category.id === current)) {
      out.push({ value: current, label: '(deleted)', depth: 0 });
    }
    for (const n of tree)
      out.push({ value: n.category.id, label: n.category.name, depth: n.depth });
    return out;
  }, [data, current]);
  return { options, error };
}

// <option> keeps no padding, so the depth is indented with spaces.
export const indentedLabel = (o: MedicalCategoryOption) => '   '.repeat(o.depth) + o.label;
