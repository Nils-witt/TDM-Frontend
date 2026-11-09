import { type CSSProperties, type PointerEvent, useLayoutEffect, useRef, useState } from 'react';
import type { Channel, Monitor } from '@/api/layouts';
import { channelBar, channelColor, channelsOf } from './channels';
import { fitView, normalized, type View } from './monitors';
import styles from './MonitorArrangement.module.scss';

type Gesture = {
  pointerId: number;
  id: string;
  x: number;
  y: number;
  start: Monitor; // when the gesture began
  resize: boolean; // at the bottom right corner; else moved
};

type Props = {
  monitors: Monitor[];
  selected?: string | null;
  onSelect: (id: string) => void;
  // Makes the arrangement editable, in whole grid units.
  onChange?: (monitors: Monitor[]) => void;
  // The second line of a monitor's box, such as the layout it shows.
  detail?: (m: Monitor) => string;
  channels?: Channel[];
  label: string;
};

const pad = 24; // px

// Scaled to fit its area.
function MonitorArrangement({
  monitors,
  selected,
  onSelect,
  onChange,
  detail,
  channels = [],
  label,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);
  const gesture = useRef<Gesture | null>(null);
  // While a monitor is dragged the view is kept, so the arrangement does
  // not rescale under the pointer.
  const [frozen, setFrozen] = useState<View | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setArea({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const view = frozen ?? (area ? fitView(monitors, area, pad) : null);

  const start = (e: PointerEvent<HTMLElement>, m: Monitor, resize: boolean) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelect(m.id);
    if (!onChange || !view) return;
    gesture.current = {
      pointerId: e.pointerId,
      id: m.id,
      x: e.clientX,
      y: e.clientY,
      start: m,
      resize,
    };
    setFrozen(view);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const move = (e: PointerEvent<HTMLElement>) => {
    const g = gesture.current;
    if (!g || g.pointerId !== e.pointerId || !onChange || !view) return;
    const dx = Math.round((e.clientX - g.x) / view.scale);
    const dy = Math.round((e.clientY - g.y) / view.scale);
    const next = g.resize
      ? {
          ...g.start,
          width: Math.max(1, g.start.width + dx),
          height: Math.max(1, g.start.height + dy),
        }
      : { ...g.start, x: g.start.x + dx, y: g.start.y + dy };
    const current = monitors.find((m) => m.id === g.id);
    if (
      current &&
      current.x === next.x &&
      current.y === next.y &&
      current.width === next.width &&
      current.height === next.height
    ) {
      return;
    }
    onChange(monitors.map((m) => (m.id === g.id ? next : m)));
  };

  const end = (e: PointerEvent<HTMLElement>) => {
    if (gesture.current?.pointerId !== e.pointerId) return;
    gesture.current = null;
    setFrozen(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    // Positions are kept non-negative, starting at the top left monitor.
    const next = normalized(monitors);
    if (onChange && next !== monitors) onChange(next);
  };

  const pointer = (m: Monitor, resize: boolean) => ({
    onPointerDown: (e: PointerEvent<HTMLElement>) => start(e, m, resize),
    onPointerMove: move,
    onPointerUp: end,
    onPointerCancel: end,
  });

  return (
    <div
      className={`${styles.arrangement}${onChange ? ` ${styles.editable}` : ''}`}
      ref={ref}
      role={onChange ? 'group' : 'radiogroup'}
      aria-label={label}
    >
      {view &&
        monitors.map((m) => {
          const its = channelsOf(channels, m.id);
          const style: CSSProperties = {
            left: view.offsetX + m.x * view.scale,
            top: view.offsetY + m.y * view.scale,
            width: m.width * view.scale,
            height: m.height * view.scale,
            ...(its.length > 0 && ({ '--channel-bar': channelBar(its) } as CSSProperties)),
          };
          const isSelected = m.id === selected;
          const className = [
            styles.monitor,
            isSelected && styles.selected,
            its.length > 0 && styles.inChannel,
          ]
            .filter(Boolean)
            .join(' ');
          const content = (
            <>
              <span className={styles.name}>{m.name}</span>
              {its.length > 0 && (
                <span className={styles.channels}>
                  {its.map((c) => (
                    <span
                      key={c.id}
                      className={styles.channel}
                      style={{ '--channel': channelColor(c) } as CSSProperties}
                    >
                      <span className={styles.dot} aria-hidden="true" />
                      {c.name}
                    </span>
                  ))}
                </span>
              )}
              {detail && <span className={styles.detail}>{detail(m)}</span>}
              {onChange && (
                <span className={styles.size}>
                  {m.width} × {m.height}
                </span>
              )}
            </>
          );
          return onChange ? (
            <div key={m.id} className={className} style={style} {...pointer(m, false)}>
              {content}
              <div
                className={styles.handle}
                title="Resize"
                aria-label={`Resize ${m.name}`}
                {...pointer(m, true)}
              />
            </div>
          ) : (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={className}
              style={style}
              onClick={() => onSelect(m.id)}
            >
              {content}
            </button>
          );
        })}
    </div>
  );
}

export default MonitorArrangement;
