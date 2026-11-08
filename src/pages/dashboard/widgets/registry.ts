import { lazy } from 'react';
import type { Widget } from './widget';

const ExampleWidget = lazy(() => import('./Example/Example.tsx'));

const Example: Widget = {
  id: 'Example',
  name: 'Example',
  category: 'general',
  description: 'A starting point for new widgets; shares a selection over channels.',
  emits: ['selection'],
  consumes: ['selection'],
  minWidth: 15,
  maxWidth: 120,
  minHeight: 8,
  maxHeight: 800,
  defaultWidth: 30,
  defaultHeight: 20,
  options: [{ key: 'greeting', label: 'Greeting', type: 'text', default: 'Hello from Universam' }],
  Component: ExampleWidget,
};

export const widgets: Record<string, Widget> = Object.fromEntries([Example].map((w) => [w.id, w]));
