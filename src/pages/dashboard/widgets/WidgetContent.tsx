import { memo, Suspense } from 'react';
import { hasPermission, useIsAdmin, useSession } from '@/app/session';
import ErrorBoundary from '@/components/ErrorBoundary';
import Spinner from '@/components/Spinner';
import { EmptyState } from './shared/WidgetStates';
import type { Widget } from './widget';
import { resolveOptions, type WidgetOptionValues } from './widgetOptions';

// Memoized so that moving its frame or window does not render the widget again.
function WidgetContent({ widget, options }: { widget: Widget; options?: WidgetOptionValues }) {
  const admin = useIsAdmin();
  const { principal } = useSession();
  if (widget.adminOnly && !admin) {
    return <EmptyState>Only administrators can use this widget.</EmptyState>;
  }
  if (widget.permission && !hasPermission(principal, widget.permission)) {
    return <EmptyState>This widget needs the permission {widget.permission}.</EmptyState>;
  }
  return (
    <ErrorBoundary what="widget">
      <Suspense fallback={<Spinner compact />}>
        <widget.Component options={resolveOptions(widget.options, options)} />
      </Suspense>
    </ErrorBoundary>
  );
}

export default memo(WidgetContent);
