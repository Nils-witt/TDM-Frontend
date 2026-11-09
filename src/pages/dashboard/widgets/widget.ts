import type { ComponentType } from 'react';
import type { ChannelEvent } from '@/api/layouts';
import type { WidgetCategory } from './widgetCategories';
import type { ResolvedOptions, WidgetOption, WidgetProps } from './widgetOptions';

// Sizes are in grid cells; a layout entry's size is clamped to these bounds.
interface BaseWidget {
  id: string; // referenced by the layout's "widget" field
  name: string; // shown as the widget's title
  // Group and one-sentence text in the layout editor's widget picker.
  category: WidgetCategory;
  description: string;
  // The channel events it sets and reads, listed in the widget picker;
  // reading the selection to highlight it counts.
  emits?: ChannelEvent[];
  consumes?: ChannelEvent[];
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  defaultWidth: number;
  defaultHeight: number;
  options?: WidgetOption[];
  // Opened by other widgets in windows only; the layout editor does not offer
  // them.
  windowOnly?: boolean;
  // Left out of the widget picker only; layouts that hold it still show it.
  hiddenInPicker?: boolean;
  // Non-admins see a notice instead, so the widget never calls the API.
  adminOnly?: boolean;
  // A window's title for the options it was opened with; else name.
  title?: (options: ResolvedOptions) => string;
}

export interface Widget extends BaseWidget {
  Component: ComponentType<WidgetProps>;
}
