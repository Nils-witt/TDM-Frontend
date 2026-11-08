import { memo, Suspense } from 'react';
import WidgetErrorBoundary from './WidgetErrorBoundary';
import Spinner from '@/components/Spinner';
import type { Widget } from './widget';
import { resolveOptions, type WidgetOptionValues } from './widgetOptions';

// Memoized so that moving its frame or window does not render the widget again.
function WidgetContent({ widget, options }: { widget: Widget; options?: WidgetOptionValues }) {
  return (
    <WidgetErrorBoundary>
      <Suspense fallback={<Spinner compact />}>
        <widget.Component options={resolveOptions(widget.options, options)} />
      </Suspense>
    </WidgetErrorBoundary>
  );
}

export default memo(WidgetContent);
