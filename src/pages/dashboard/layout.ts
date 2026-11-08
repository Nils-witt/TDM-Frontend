import raw from './dashboard.json';
import type { WidgetOptionValues } from './widgets/widgetOptions';

// A number of cells (1em each) or a percentage of the dashboard area (the
// viewport below the menu bar).
type Length = number | `${number}%`;

// "fill" expands away from the anchored side up to the next widget, or to the
// dashboard's edge.
type Size = Length | 'fill';

// Offsets are from the dashboard's edges. Each axis takes exactly two of its
// three values (left, width, right; top, height, bottom). Sizes are clamped to
// the widget's bounds, keeping the anchored side in place (left or top when
// both offsets are given).
export type LayoutItem = {
  widget: string;
  left?: Length;
  right?: Length;
  width?: Size;
  top?: Length;
  bottom?: Length;
  height?: Size;
  options?: WidgetOptionValues;
};

export type DashboardLayout = {
  widgets: LayoutItem[];
};

export const dashboardLayout = raw as DashboardLayout;

// In cells.
export type Bounds = {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
};

// Pixels, relative to the dashboard area.
export type Box = { left: number; top: number; width: number; height: number };

const percent = /^\d+(?:\.\d+)?%$/;

// null if l is not a valid Length.
function lengthPx(l: unknown, total: number, em: number): number | null {
  if (typeof l === 'number' && Number.isFinite(l)) return l * em;
  if (typeof l === 'string' && percent.test(l)) return (parseFloat(l) / 100) * total;
  return null;
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

// Pixels from the near (left/top) and far (right/bottom) edge; exactly two of
// the three are set.
type AxisSpec = {
  start: number | null;
  end: number | null;
  size: number | 'fill' | null;
  min: number;
  max: number;
};

// Pixels from the near edge.
type Span = { start: number; size: number };

const spanEnd = (s: Span) => s.start + s.size;

// Spans that only touch do not overlap.
const overlaps = (a: Span, b: Span) => a.start < spanEnd(b) && b.start < spanEnd(a);

// null if invalid or not exactly two values are given.
function parseAxis(
  start: unknown,
  size: unknown,
  end: unknown,
  total: number,
  em: number,
  min: number,
  max: number,
): AxisSpec | null {
  if ([start, size, end].filter((v) => v !== undefined).length !== 2) return null;
  const px = (v: unknown) => (v === undefined ? null : lengthPx(v, total, em));
  const a: AxisSpec = {
    start: px(start),
    end: px(end),
    size: size === 'fill' ? 'fill' : px(size),
    min,
    max,
  };
  if (start !== undefined && a.start === null) return null;
  if (end !== undefined && a.end === null) return null;
  if (size !== undefined && a.size === null) return null;
  return a;
}

// null for a fill axis.
function fixedSpan(a: AxisSpec, total: number): Span | null {
  if (a.size === 'fill') return null;
  if (a.size === null) {
    const start = a.start!;
    return { start, size: clamp(total - a.end! - start, a.min, a.max) };
  }
  const size = clamp(a.size, a.min, a.max);
  return { start: a.start ?? total - a.end! - size, size };
}

// Stands in for an unresolved fill axis: its minimum size from its anchored
// side, or with toEdge all the way to the opposite edge.
function provisionalSpan(a: AxisSpec, total: number, toEdge: boolean): Span {
  if (a.start !== null) return { start: a.start, size: toEdge ? total - a.start : a.min };
  const end = total - a.end!;
  const size = toEdge ? end : a.min;
  return { start: end - size, size };
}

// To the nearest of others beyond the anchored side, or to the dashboard's
// edge.
function fillSpan(a: AxisSpec, total: number, others: Span[]): Span {
  if (a.start !== null) {
    const start = a.start;
    const edge = Math.min(total, ...others.filter((o) => o.start > start).map((o) => o.start));
    return { start, size: clamp(edge - start, a.min, a.max) };
  }
  const end = total - a.end!;
  const edge = Math.max(0, ...others.filter((o) => spanEnd(o) < end).map(spanEnd));
  const size = clamp(end - edge, a.min, a.max);
  return { start: end - size, size };
}

// An item with an invalid layout gets null. "fill" sizes stop at the nearest
// widget beyond the anchored side that overlaps the item on the other axis.
// Fill widths are resolved first, in layout order, treating fill heights as
// reaching the far edge; fill heights then with the final widths. An unresolved
// fill counts as its minimum size from its anchored side.
export function resolveLayout(
  items: LayoutItem[],
  area: { width: number; height: number },
  em: number,
  bounds: (item: LayoutItem) => Bounds | undefined,
): (Box | null)[] {
  const specs = items.map((item) => {
    const b = bounds(item);
    const h = parseAxis(
      item.left,
      item.width,
      item.right,
      area.width,
      em,
      b ? b.minWidth * em : 0,
      b ? b.maxWidth * em : Infinity,
    );
    const v = parseAxis(
      item.top,
      item.height,
      item.bottom,
      area.height,
      em,
      b ? b.minHeight * em : 0,
      b ? b.maxHeight * em : Infinity,
    );
    return h && v ? { h, v } : null;
  });
  const xs = specs.map((s) => (s ? fixedSpan(s.h, area.width) : null));
  const ys = specs.map((s) => (s ? fixedSpan(s.v, area.height) : null));

  // Fill widths, against vertical extents that may still be provisional.
  const yOf = (i: number) => ys[i] ?? provisionalSpan(specs[i]!.v, area.height, true);
  for (const [i, s] of specs.entries()) {
    if (s === null || xs[i] !== null) continue;
    const others = specs.flatMap((o, j) =>
      o === null || j === i || !overlaps(yOf(i), yOf(j))
        ? []
        : [xs[j] ?? provisionalSpan(o.h, area.width, false)],
    );
    xs[i] = fillSpan(s.h, area.width, others);
  }

  // Fill heights, against the final widths.
  for (const [i, s] of specs.entries()) {
    if (s === null || ys[i] !== null) continue;
    const others = specs.flatMap((o, j) =>
      o === null || j === i || !overlaps(xs[i]!, xs[j]!)
        ? []
        : [ys[j] ?? provisionalSpan(o.v, area.height, false)],
    );
    ys[i] = fillSpan(s.v, area.height, others);
  }

  return specs.map((s, i) =>
    s === null
      ? null
      : { left: xs[i]!.start, width: xs[i]!.size, top: ys[i]!.start, height: ys[i]!.size },
  );
}

// Editing works on resolved pixel boxes. Drags write them back in whole cells,
// keeping each axis anchored to the same side(s); changing an anchor or a
// "fill" size never moves a widget.

export type Axis = 'x' | 'y';

const axisKeys = {
  x: { start: 'left', end: 'right', size: 'width' },
  y: { start: 'top', end: 'bottom', size: 'height' },
} as const;

// both stretches between the near and far edge.
export type Anchor = 'start' | 'end' | 'both';

export function anchorOf(item: LayoutItem, axis: Axis): Anchor {
  const k = axisKeys[axis];
  if (item[k.start] !== undefined && item[k.end] !== undefined) return 'both';
  return item[k.start] !== undefined ? 'start' : 'end';
}

export const isFill = (item: LayoutItem, axis: Axis) => item[axisKeys[axis].size] === 'fill';

const cells = (px: number, em: number) => Math.max(0, Math.round(px / em));

// Pixels from the near edge.
type Extent = { start: number; size: number };

const extentOf = (box: Box, axis: Axis): Extent =>
  axis === 'x' ? { start: box.left, size: box.width } : { start: box.top, size: box.height };

// A "fill" size is kept for the near or far anchor; stretching drops it.
function withAxis(
  item: LayoutItem,
  axis: Axis,
  anchor: Anchor,
  e: Extent,
  total: number,
  em: number,
  fill: boolean,
): LayoutItem {
  const k = axisKeys[axis];
  const next: LayoutItem = { ...item };
  delete next[k.start];
  delete next[k.end];
  delete next[k.size];
  const size = fill ? ('fill' as const) : cells(e.size, em);
  if (anchor !== 'end') next[k.start] = cells(e.start, em);
  if (anchor !== 'start') next[k.end] = cells(total - e.start - e.size, em);
  if (anchor !== 'both') next[k.size] = size;
  return next;
}

export type AxisChange = 'move' | 'resize';

// Axes the gesture did not change are kept; changed ones keep their anchor and
// snap to whole cells. Moving keeps a "fill" size, resizing replaces it.
export function itemFromBox(
  item: LayoutItem,
  box: Box,
  area: { width: number; height: number },
  em: number,
  changed: Partial<Record<Axis, AxisChange>>,
): LayoutItem {
  let next = item;
  for (const axis of ['x', 'y'] as const) {
    const change = changed[axis];
    if (!change) continue;
    const total = axis === 'x' ? area.width : area.height;
    const fill = change === 'move' && isFill(item, axis);
    next = withAxis(next, axis, anchorOf(item, axis), extentOf(box, axis), total, em, fill);
  }
  return next;
}

// Rounded to hundredths, not whole cells, so a widget whose anchor changes
// stays where it is.
const exactCells = (px: number, em: number) => Math.max(0, Math.round((px / em) * 100) / 100);

// Does not move the widget: offsets from sides it stays anchored to and its
// size are kept; the offset from a newly anchored side is measured from its
// current box. Stretching to both sides drops the size.
function setAnchor(
  item: LayoutItem,
  axis: Axis,
  anchor: Anchor,
  box: Box,
  area: { width: number; height: number },
  em: number,
): LayoutItem {
  const current = anchorOf(item, axis);
  if (current === anchor) return item;
  const k = axisKeys[axis];
  const e = extentOf(box, axis);
  const total = axis === 'x' ? area.width : area.height;
  const next: LayoutItem = { ...item };
  delete next[k.start];
  delete next[k.end];
  delete next[k.size];
  if (anchor !== 'end') {
    next[k.start] = current === 'end' ? exactCells(e.start, em) : item[k.start];
  }
  if (anchor !== 'start') {
    next[k.end] = current === 'start' ? exactCells(total - e.start - e.size, em) : item[k.end];
  }
  if (anchor !== 'both') next[k.size] = item[k.size] ?? exactCells(e.size, em);
  return next;
}

// Off fixes the current size; neither moves the widget. A stretched axis is
// anchored to its near edge first.
export function setFill(
  item: LayoutItem,
  axis: Axis,
  on: boolean,
  box: Box,
  area: { width: number; height: number },
  em: number,
): LayoutItem {
  const anchored =
    anchorOf(item, axis) === 'both' ? setAnchor(item, axis, 'start', box, area, em) : item;
  return {
    ...anchored,
    [axisKeys[axis].size]: on ? 'fill' : exactCells(extentOf(box, axis).size, em),
  };
}

// n/s for top/bottom, w/e for left/right.
export type Corner = 'nw' | 'ne' | 'sw' | 'se';

export const corners: Corner[] = ['nw', 'ne', 'sw', 'se'];

// null if an axis is stretched.
export function cornerOf(item: LayoutItem): Corner | null {
  const x = anchorOf(item, 'x');
  const y = anchorOf(item, 'y');
  if (x === 'both' || y === 'both') return null;
  return `${y === 'start' ? 'n' : 's'}${x === 'start' ? 'w' : 'e'}`;
}

// Does not move the widget; it then keeps its distance to that corner when the
// dashboard is resized.
export function setCorner(
  item: LayoutItem,
  corner: Corner,
  box: Box,
  area: { width: number; height: number },
  em: number,
): LayoutItem {
  const x = setAnchor(item, 'x', corner[1] === 'w' ? 'start' : 'end', box, area, em);
  return setAnchor(x, 'y', corner[0] === 'n' ? 'start' : 'end', box, area, em);
}

// Top left, at its default size clamped to its bounds.
export function defaultItem(
  id: string,
  b: Bounds & { defaultWidth: number; defaultHeight: number },
) {
  return {
    widget: id,
    left: 0,
    top: 0,
    width: clamp(b.defaultWidth, b.minWidth, b.maxWidth),
    height: clamp(b.defaultHeight, b.minHeight, b.maxHeight),
  } satisfies LayoutItem;
}

export type Edges = 'n' | 'e' | 's' | 'w' | 'ne' | 'se' | 'sw' | 'nw';

// Moves by dx, dy with edges undefined, else resizes at those edges; stays
// within the area and the widget's bounds (in pixels).
export function dragBox(
  box: Box,
  dx: number,
  dy: number,
  edges: Edges | undefined,
  area: { width: number; height: number },
  bounds: { minWidth: number; maxWidth: number; minHeight: number; maxHeight: number },
): Box {
  if (!edges) {
    return {
      ...box,
      left: clamp(box.left + dx, 0, Math.max(0, area.width - box.width)),
      top: clamp(box.top + dy, 0, Math.max(0, area.height - box.height)),
    };
  }
  const resize = (
    start: number,
    size: number,
    d: number,
    near: boolean,
    far: boolean,
    total: number,
    min: number,
    max: number,
  ) => {
    if (far) {
      return { start, size: clamp(size + d, min, Math.max(min, Math.min(max, total - start))) };
    }
    if (near) {
      const end = start + size;
      const s = clamp(size - d, min, Math.max(min, Math.min(max, end)));
      return { start: end - s, size: s };
    }
    return { start, size };
  };
  const h = resize(
    box.left,
    box.width,
    dx,
    edges.includes('w'),
    edges.includes('e'),
    area.width,
    bounds.minWidth,
    bounds.maxWidth,
  );
  const v = resize(
    box.top,
    box.height,
    dy,
    edges.includes('n'),
    edges.includes('s'),
    area.height,
    bounds.minHeight,
    bounds.maxHeight,
  );
  return { left: h.start, width: h.size, top: v.start, height: v.size };
}
