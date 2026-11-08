import { createContext, use } from 'react';

// The element at the top of the widget's frame or window a WidgetActionBar
// renders into; null before it is mounted or outside a widget.
export const WidgetActionSlotContext = createContext<HTMLElement | null>(null);

export const useWidgetActionSlot = () => use(WidgetActionSlotContext);
