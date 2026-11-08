import { useDashboard } from '../../dashboardContext';
import { NoSelection } from '../shared/WidgetStates';
import WidgetActionBar, { WidgetAction } from '../shared/WidgetActionBar';
import type { WidgetProps } from '../widgetOptions';

const items = ['A', 'B', 'C'];

function Example({ options }: WidgetProps) {
  const { selectedId, update } = useDashboard();
  return (
    <>
      <WidgetActionBar label="Example actions">
        <WidgetAction disabled={selectedId === null} onClick={() => update({ selectedId: null })}>
          Clear
        </WidgetAction>
      </WidgetActionBar>
      <p>{String(options.greeting)}</p>
      <div className="row">
        {items.map((id) => (
          <button
            key={id}
            type="button"
            className="btn"
            aria-pressed={selectedId === id}
            onClick={() => update({ selectedId: id })}
          >
            {id}
          </button>
        ))}
      </div>
      {selectedId === null ? (
        <NoSelection className="mt" />
      ) : (
        <p className="mt">Selected: {selectedId}</p>
      )}
    </>
  );
}

export default Example;
