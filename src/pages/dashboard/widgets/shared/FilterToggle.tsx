import { WidgetAction } from './WidgetActionBar';

// Hidden filters still apply, so it counts the active ones.
function FilterToggle({
  open,
  active,
  onToggle,
}: {
  open: boolean;
  active: number;
  onToggle: () => void;
}) {
  return (
    <WidgetAction pressed={open} title={open ? 'Hide filters' : 'Show filters'} onClick={onToggle}>
      Filters
      {active > 0 && ` (${active})`}
    </WidgetAction>
  );
}

export default FilterToggle;
