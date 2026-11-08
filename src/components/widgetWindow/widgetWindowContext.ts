import { createContext, use } from 'react';
import type { WidgetOptionValues } from '@/pages/dashboard/widgets/widgetOptions';

type WidgetWindows = {
  // Returns the window's key.
  openWidget: (widgetId: string, options?: WidgetOptionValues) => number;
  closeWidget: (key: number) => void;
};

export const WidgetWindowContext = createContext<WidgetWindows | null>(null);

export function useWidgetWindows(): WidgetWindows {
  const v = use(WidgetWindowContext);
  if (!v) throw new Error('useWidgetWindows outside of WidgetWindows');
  return v;
}

// Closes the widget window its children are shown in; null outside of one.
export const CurrentWidgetWindowContext = createContext<(() => void) | null>(null);

// null when the widget is not in a window, e.g. on the dashboard grid.
export const useCloseWidgetWindow = () => use(CurrentWidgetWindowContext);
