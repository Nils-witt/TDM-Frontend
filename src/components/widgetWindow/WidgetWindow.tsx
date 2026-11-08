import {
  type CSSProperties,
  memo,
  type PointerEvent,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import Alert from '../Alert';
import { CloseIcon } from '../icons';
import { widgets } from '@/pages/dashboard/widgets/registry';
import WidgetBody from '@/pages/dashboard/widgets/WidgetBody';
import WidgetContent from '@/pages/dashboard/widgets/WidgetContent';
import { resolveOptions, type WidgetOptionValues } from '@/pages/dashboard/widgets/widgetOptions';
import { CurrentWidgetWindowContext } from './widgetWindowContext';
import styles from './WidgetWindow.module.scss';

// px each further window opens down and right.
const cascadeOffset = 24;

type Position = { left: number; top: number };

// Fully on screen where the box fits, else its top left corner.
const clampToViewport = ({ left, top }: Position, width: number, height: number): Position => ({
  left: Math.max(0, Math.min(left, window.innerWidth - width)),
  top: Math.max(0, Math.min(top, window.innerHeight - height)),
});

type Props = {
  windowKey: number;
  widgetId: string;
  options?: WidgetOptionValues;
  cascade: number; // how many windows were open before this one
  zIndex: number;
  // Stable, so opening, closing or raising another window does not render this
  // one.
  onFocus: (key: number) => void;
  onClose: (key: number) => void;
};

// Floating and non-modal; resized within the widget's bounds.
function WidgetWindow({ windowKey, widgetId, options, cascade, zIndex, onFocus, onClose }: Props) {
  const widget = widgets[widgetId];
  // Stable for the window's life: it is the value of
  // CurrentWidgetWindowContext, which the widget inside reads.
  const close = useCallback(() => onClose(windowKey), [onClose, windowKey]);
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [pos, setPos] = useState<Position | null>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  // Center the window once its size is known, offset by its cascade index.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const offset = cascade * cascadeOffset;
    setPos(
      clampToViewport(
        {
          left: (window.innerWidth - width) / 2 + offset,
          top: (window.innerHeight - height) / 2 + offset,
        },
        width,
        height,
      ),
    );
  }, [cascade]);

  const startDrag = (e: PointerEvent<HTMLElement>) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    drag.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const moveDrag = (e: PointerEvent<HTMLElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!drag.current || !rect) return;
    setPos(
      clampToViewport(
        { left: e.clientX - drag.current.dx, top: e.clientY - drag.current.dy },
        rect.width,
        rect.height,
      ),
    );
  };

  const endDrag = (e: PointerEvent<HTMLElement>) => {
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const title = widget
    ? (widget.title?.(resolveOptions(widget.options, options)) ?? widget.name)
    : widgetId;

  const style: CSSProperties = {
    zIndex,
    left: pos?.left ?? 0,
    top: pos?.top ?? 0,
    visibility: pos ? undefined : 'hidden',
    ...(widget && {
      width: `${widget.defaultWidth}em`,
      height: `${widget.defaultHeight}em`,
      minWidth: `${widget.minWidth}em`,
      maxWidth: `${widget.maxWidth}em`,
      minHeight: `${widget.minHeight}em`,
      maxHeight: `${widget.maxHeight}em`,
    }),
  };

  return (
    <div
      ref={ref}
      role="dialog"
      aria-labelledby={titleId}
      className={`card ${styles.window}`}
      style={style}
      onPointerDown={() => onFocus(windowKey)}
    >
      <header
        className={styles.title}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="icon-btn" aria-label="Close" onClick={close}>
          <CloseIcon />
        </button>
      </header>
      <WidgetBody placement="window">
        {widget ? (
          <CurrentWidgetWindowContext value={close}>
            <WidgetContent widget={widget} options={options} />
          </CurrentWidgetWindowContext>
        ) : (
          <Alert severity="warning">Unknown widget “{widgetId}”</Alert>
        )}
      </WidgetBody>
    </div>
  );
}

export default memo(WidgetWindow);
