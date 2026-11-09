import { memo, Suspense } from 'react';
import { useIsAdmin } from '@/app/session';
import WidgetErrorBoundary from './WidgetErrorBoundary';
import Spinner from '@/components/Spinner';
import { EmptyState } from './shared/WidgetStates';
import type { Widget } from './widget';
import { resolveOptions, type WidgetOptionValues } from './widgetOptions';

// Memoized so that moving its frame or window does not render the widget again.
function WidgetContent({ widget, options }: { widget: Widget; options?: WidgetOptionValues }) {
  const admin = useIsAdmin();
  if (widget.adminOnly && !admin) {
    return <EmptyState>Only administrators can use this widget.</EmptyState>;
  }
  return (
    <WidgetErrorBoundary>
      <Suspense fallback={<Spinner compact />}>
        <widget.Component options={resolveOptions(widget.options, options)} />
      </Suspense>
    </WidgetErrorBoundary>
  );
}

export default memo(WidgetContent);
