import { WidgetAction } from './WidgetActionBar';

function FilterToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <WidgetAction pressed={open} title={open ? 'Hide filters' : 'Show filters'} onClick={onToggle}>
      Filters
    </WidgetAction>
  );
}

export default FilterToggle;
