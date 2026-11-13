import { type CSSProperties, memo, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Alert from '@/components/Alert';
import { resolveLayout, type Box, type LayoutItem } from './layout';
import { useArrangement, useLayoutDraft, useLayoutView } from './layoutContext';
import LayoutEditBar from './LayoutEditBar';
import ArrangementEditor from './monitors/ArrangementEditor';
import MonitorPicker from './monitors/MonitorPicker';
import WidgetEditOverlay from './WidgetEditOverlay';
import { widgets } from './widgets/registry';
import WidgetBody from './widgets/WidgetBody';
import WidgetContent from './widgets/WidgetContent';
import { WidgetInstanceContext, widgetInstanceKey } from './widgets/widgetState';
import styles from './Dashboard.module.scss';

// Each widget is inset by gutter on every side of its box, leaving twice that
// between neighbours.
const gutter = 0.25; // em

export type Area = { width: number; height: number; em: number };

type FrameProps = {
  // The layout and monitor whose items these are, for the widgets' stored
  // state (widgetState.ts).
  layoutId: string;
  monitorId: string;
  index: number;
  item: LayoutItem;
  box: Box;
  area: Area;
  editing: boolean;
};

// While editing, the content is inert and an overlay moves and resizes it.
function WidgetFrame({ layoutId, monitorId, index, item, box, area, editing }: FrameProps) {
  const widget = widgets[item.widget];
  const style: CSSProperties = {
    position: 'absolute',
    left: `calc(${box.left}px + ${gutter}em)`,
    top: `calc(${box.top}px + ${gutter}em)`,
    width: `calc(${box.width}px - ${2 * gutter}em)`,
    height: `calc(${box.height}px - ${2 * gutter}em)`,
  };

  return (
    <section
      className={`card ${styles.widget}${editing ? ` ${styles.editing}` : ''}`}
      style={style}
    >
      {widget ? (
        <WidgetBody placement="frame" inert={editing}>
          <WidgetInstanceContext value={widgetInstanceKey(layoutId, monitorId, index, item.widget)}>
            <WidgetContent widget={widget} options={item.options} />
          </WidgetInstanceContext>
        </WidgetBody>
      ) : (
        <Alert severity="warning">Unknown widget “{item.widget}”</Alert>
      )}
      {editing && <WidgetEditOverlay index={index} item={item} box={box} area={area} />}
    </section>
  );
}

// A layout change resolves every box anew; a frame whose item and box are
// unchanged, all but the one dragged, say, is not rendered again.
const sameBox = (a: Box, b: Box) =>
  a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;

const MemoWidgetFrame = memo(
  WidgetFrame,
  (prev, next) =>
    prev.layoutId === next.layoutId &&
    prev.monitorId === next.monitorId &&
    prev.index === next.index &&
    prev.item === next.item &&
    prev.area === next.area &&
    prev.editing === next.editing &&
    sameBox(prev.box, next.box),
);

// A layout with several monitors first asks which monitor this window is.
function Dashboard() {
  const { arrangement } = useArrangement();
  const { draft } = useLayoutDraft();
  const { active, monitor } = useLayoutView();
  if (arrangement) return <ArrangementEditor />;
  if (draft) {
    // Editing shows the edited layout's widget state; a new one starts empty.
    return (
      <WidgetDashboard
        layoutId={draft.target?.id ?? 'new'}
        monitorId={draft.monitorId}
        items={draft.widgets}
        editing
      />
    );
  }
  if (!monitor) return <MonitorPicker />;
  return (
    <WidgetDashboard
      layoutId={active.id}
      monitorId={monitor.id}
      items={monitor.widgets}
      editing={false}
    />
  );
}

// Measures its area to resolve percentage and "fill" sizes, and lays the
// widgets out again on resize.
function WidgetDashboard({
  layoutId,
  monitorId,
  items,
  editing,
}: {
  layoutId: string;
  monitorId: string;
  items: LayoutItem[];
  editing: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState<Area | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () =>
      setArea({
        width: el.clientWidth,
        height: el.clientHeight,
        em: parseFloat(getComputedStyle(el).fontSize),
      });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const boxes = useMemo(
    () => (area ? resolveLayout(items, area, area.em, (item) => widgets[item.widget]) : []),
    [items, area],
  );

  return (
    <>
      <div className={`${styles.dashboard}${editing ? ` ${styles.editing}` : ''}`} ref={ref}>
        {area &&
          boxes.map((box, i) => {
            const item = items[i];
            return box ? (
              <MemoWidgetFrame
                key={i}
                layoutId={layoutId}
                monitorId={monitorId}
                index={i}
                item={item}
                box={box}
                area={area}
                editing={editing}
              />
            ) : (
              <Alert key={i} severity="warning">
                Invalid layout for widget “{item.widget}”
              </Alert>
            );
          })}
      </div>
      {editing && <LayoutEditBar />}
    </>
  );
}

export default Dashboard;
