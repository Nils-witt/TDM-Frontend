import { criticalCategoryLabel, type PatientCriticalCategory } from '@/api/patients';
import Chip from '@/components/Chip';

// The label is written out, so the category does not rest on color alone.
function CriticalCategoryBadge({ category }: { category: PatientCriticalCategory }) {
  return (
    <Chip
      label={criticalCategoryLabel(category)}
      tone={category === 'not_set' ? 'default' : category}
    />
  );
}

export default CriticalCategoryBadge;
