import { type PointerEvent, useRef, useState } from 'react';
import { CloseIcon, TuneIcon } from '@/components/icons';
import type { Area } from './Dashboard';
import {
  anchorOf,
  type Axis,
  type Box,
  type Corner,
  cornerOf,
  corners,
  dragBox,
  type Edges,
  isFill,
  itemFromBox,
  type LayoutItem,
  setCorner,
  setFill,
} from './layout';
import { useLayoutActions } from './layoutContext';
import WidgetOptionsEditor from './WidgetOptionsEditor';
import { widgets } from './widgets/registry';
import styles from './WidgetEditOverlay.module.scss';

const handles: Edges[] = ['n', 'e', 's', 'w', 'ne', 'se', 'sw', 'nw'];

const cornerNames: Record<Corner, string> = {
  nw: 'top left',
  ne: 'top right',
  sw: 'bottom left',
  se: 'bottom right',
};

// One for a widget anchored to a corner, two or four for axes stretched between
// both sides.
function anchorPins(item: LayoutItem): Corner[] {
  const sides = (axis: Axis, near: string, far: string) => {
    const a = anchorOf(item, axis);
    return a === 'both' ? [near, far] : [a === 'start' ? near : far];
  };
  return sides('y', 'n', 's').flatMap((v) => sides('x', 'w', 'e').map((h) => `${v}${h}` as Corner));
}

type Gesture = {
  pointerId: number;
  x: number;
  y: number;
  box: Box; // the widget's box when the gesture began
  item: LayoutItem; // when the gesture began
  edges?: Edges; // undefined: moved
  group: string; // undo group of the changes it makes
};

type Props = { index: number; item: LayoutItem; box: Box; area: Area };

// The handle of the corner the widget is anchored to is filled. Changes snap to
// whole cells.
function WidgetEditOverlay({ index, item, box, area }: Props) {
  // Only the stable actions: a drag changes the draft on every step, and
  // reading it here would render every widget's overlay again each time.
  const { updateDraft } = useLayoutActions();
  const gesture = useRef<Gesture | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const widget = widgets[item.widget];
  const hasOptions = (widget?.options?.length ?? 0) > 0;
  const em = area.em;

  const replace = (next: LayoutItem | null, group?: string) => {
    updateDraft((draft) => {
      const list = draft.widgets.slice();
      if (next) list[index] = next;
      else list.splice(index, 1);
      return { widgets: list };
    }, group);
  };

  const start = (e: PointerEvent<HTMLElement>, edges?: Edges) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    gesture.current = {
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      box,
      item,
      edges,
      group: `gesture:${index}:${e.pointerId}:${e.timeStamp}`,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const move = (e: PointerEvent<HTMLElement>) => {
    const g = gesture.current;
    if (!g || g.pointerId !== e.pointerId) return;
    const bounds = {
      minWidth: (widget?.minWidth ?? 1) * em,
      maxWidth: (widget?.maxWidth ?? Infinity) * em,
      minHeight: (widget?.minHeight ?? 1) * em,
      maxHeight: (widget?.maxHeight ?? Infinity) * em,
    };
    const next = dragBox(g.box, e.clientX - g.x, e.clientY - g.y, g.edges, area, bounds);
    const changed = g.edges
      ? {
          x: /[ew]/.test(g.edges) ? ('resize' as const) : undefined,
          y: /[ns]/.test(g.edges) ? ('resize' as const) : undefined,
        }
      : { x: 'move' as const, y: 'move' as const };
    const updated = itemFromBox(g.item, next, area, em, changed);
    if (JSON.stringify(updated) !== JSON.stringify(item)) replace(updated, g.group);
  };

  const end = (e: PointerEvent<HTMLElement>) => {
    if (gesture.current?.pointerId !== e.pointerId) return;
    gesture.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const pointer = (edges?: Edges) => ({
    onPointerDown: (e: PointerEvent<HTMLElement>) => start(e, edges),
    onPointerMove: move,
    onPointerUp: end,
    onPointerCancel: end,
  });

  // Anchoring to a corner keeps the position relative to it when the dashboard
  // is resized.
  const current = cornerOf(item);
  const pins = anchorPins(item);
  const cornerPicker = (
    <div
      className={styles.cornerPicker}
      role="radiogroup"
      aria-label="Anchor corner"
      data-tour="widget-anchor"
    >
      {corners.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={c === current}
          className={styles.cornerCell}
          aria-label={`Anchor to the ${cornerNames[c]} corner`}
          title={`Anchor to the ${cornerNames[c]} corner`}
          onClick={() => replace(setCorner(item, c, box, area, em))}
        />
      ))}
    </div>
  );

  const fillButton = (axis: Axis) => {
    const on = isFill(item, axis);
    const what = axis === 'x' ? 'width' : 'height';
    return (
      <button
        type="button"
        className={`${styles.tool}${on ? ` ${styles.on}` : ''}`}
        aria-pressed={on}
        aria-label={`Fill ${what}`}
        title={`Fill ${what} up to the next widget`}
        onClick={() => replace(setFill(item, axis, !on, box, area, em))}
      >
        {axis === 'x' ? '↔' : '↕'}
        <span className={styles.toolLabel}>fill</span>
      </button>
    );
  };

  return (
    <div className={styles.overlay} {...pointer()}>
      <div className={styles.toolbar} onPointerDown={(e) => e.stopPropagation()}>
        <span className={styles.name} data-tour="widget-move">
          {widget?.name ?? item.widget}
        </span>
        {cornerPicker}
        <span className={styles.fill} data-tour="widget-fill">
          {fillButton('x')}
          {fillButton('y')}
        </span>
        {hasOptions && (
          <button
            type="button"
            className={`${styles.tool}${showOptions ? ` ${styles.on}` : ''}`}
            aria-pressed={showOptions}
            aria-label="Options"
            data-tour="widget-options"
            title="Widget options"
            onClick={() => setShowOptions((v) => !v)}
          >
            <TuneIcon />
          </button>
        )}
        <button
          type="button"
          className={styles.tool}
          aria-label={`Remove ${widget?.name ?? item.widget}`}
          data-tour="widget-remove"
          title="Remove widget"
          onClick={() => replace(null)}
        >
          <CloseIcon />
        </button>
      </div>
      {hasOptions && showOptions && widget && (
        <div className={styles.options} onPointerDown={(e) => e.stopPropagation()}>
          <WidgetOptionsEditor
            widget={widget}
            options={item.options}
            onChange={(options) => {
              const next: LayoutItem = { ...item, options };
              if (!options) delete next.options;
              replace(next, `options:${index}`);
            }}
          />
        </div>
      )}
      <span className={styles.size}>
        {Math.round(box.width / em)} × {Math.round(box.height / em)}
      </span>
      {handles.map((h) => (
        <div
          key={h}
          className={`${styles.handle} ${styles[h]}${pins.includes(h as Corner) ? ` ${styles.anchored}` : ''}`}
          title={pins.includes(h as Corner) ? 'Anchored corner' : undefined}
          data-tour={h === 'se' ? 'widget-resize' : undefined}
          {...pointer(h)}
        />
      ))}
    </div>
  );
}

export default WidgetEditOverlay;
