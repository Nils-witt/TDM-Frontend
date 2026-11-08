import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import type { WidgetOptionValues } from '@/pages/dashboard/widgets/widgetOptions';
import WidgetWindow from './WidgetWindow';
import { WidgetWindowContext } from './widgetWindowContext';
import styles from './WidgetWindows.module.scss';

type OpenWindow = {
  key: number;
  widgetId: string;
  options?: WidgetOptionValues;
  cascade: number;
};

// The last window is in front.
function WidgetWindows({ children }: { children: ReactNode }) {
  const [windows, setWindows] = useState<OpenWindow[]>([]);
  const nextKey = useRef(0);

  const openWidget = useCallback((widgetId: string, options?: WidgetOptionValues) => {
    const key = nextKey.current++;
    setWindows((ws) => [...ws, { key, widgetId, options, cascade: ws.length }]);
    return key;
  }, []);

  const closeWidget = useCallback((key: number) => {
    setWindows((ws) => ws.filter((w) => w.key !== key));
  }, []);

  const bringToFront = useCallback((key: number) => {
    setWindows((ws) => {
      const i = ws.findIndex((w) => w.key === key);
      if (i < 0 || i === ws.length - 1) return ws;
      return [...ws.slice(0, i), ...ws.slice(i + 1), ws[i]];
    });
  }, []);

  const value = useMemo(() => ({ openWidget, closeWidget }), [openWidget, closeWidget]);

  // Windows are rendered in key order so moving one to the front does not
  // remount it; the stacking order comes from its position in windows.
  const byKey = [...windows].sort((a, b) => a.key - b.key);

  return (
    <WidgetWindowContext value={value}>
      {children}
      <div className={styles.windows}>
        {byKey.map((w) => (
          <WidgetWindow
            key={w.key}
            windowKey={w.key}
            widgetId={w.widgetId}
            options={w.options}
            cascade={w.cascade}
            zIndex={windows.indexOf(w) + 1}
            onFocus={bringToFront}
            onClose={closeWidget}
          />
        ))}
      </div>
    </WidgetWindowContext>
  );
}

export default WidgetWindows;
