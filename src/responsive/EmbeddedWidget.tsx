import Alert from '@/components/Alert';
import WidgetBody from '@/pages/dashboard/widgets/WidgetBody';
import WidgetContent from '@/pages/dashboard/widgets/WidgetContent';
import type { WidgetOptionValues } from '@/pages/dashboard/widgets/widgetOptions';
import styles from './EmbeddedWidget.module.scss';
import { responsiveWidget } from './widgets/registry';

// A widget in a card shaped like a dashboard frame, as WidgetBody expects, but
// growing with its content, since the page scrolls rather than the widget.
function EmbeddedWidget({
  widgetId,
  options,
  title,
}: {
  widgetId: string;
  options?: WidgetOptionValues;
  title?: string;
}) {
  const widget = responsiveWidget(widgetId);
  if (!widget) return <Alert severity="warning">Unknown widget “{widgetId}”</Alert>;
  const heading = title ?? widget.name;
  return (
    <section aria-label={heading}>
      <h2 className={styles.heading}>{heading}</h2>
      <div className={styles.card}>
        <WidgetBody placement="frame">
          <WidgetContent widget={widget} options={options} />
        </WidgetBody>
      </div>
    </section>
  );
}

export default EmbeddedWidget;
