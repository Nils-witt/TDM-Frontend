import type { ReactNode } from 'react';
import Alert from '@/components/Alert';
import { widgets } from '@/pages/dashboard/widgets/registry';
import WidgetBody from '@/pages/dashboard/widgets/WidgetBody';
import WidgetContent from '@/pages/dashboard/widgets/WidgetContent';
import type { WidgetOptionValues } from '@/pages/dashboard/widgets/widgetOptions';
import styles from './MobileLayout.module.scss';

// One widget filling the screen, as in a dashboard frame; before it, optional
// screen-level controls.
function WidgetScreen({
  widgetId,
  options,
  before,
}: {
  widgetId: string;
  options?: WidgetOptionValues;
  before?: ReactNode;
}) {
  const widget = widgets[widgetId];
  return (
    <section className={styles.screen}>
      {before}
      {widget ? (
        <WidgetBody placement="frame">
          <WidgetContent widget={widget} options={options} />
        </WidgetBody>
      ) : (
        <Alert severity="warning">Unknown widget “{widgetId}”</Alert>
      )}
    </section>
  );
}

export default WidgetScreen;
