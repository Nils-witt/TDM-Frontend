import { type ReactNode, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';
import Alert from '@/components/Alert';
import SymbolIcon from '@/components/symbols/SymbolIcon';
import {
  CurrentWidgetWindowContext,
  WidgetWindowContext,
} from '@/components/widgetWindow/widgetWindowContext';
import WidgetBody from '@/pages/dashboard/widgets/WidgetBody';
import WidgetContent from '@/pages/dashboard/widgets/WidgetContent';
import { resolveOptions, type WidgetOptionValues } from '@/pages/dashboard/widgets/widgetOptions';
import styles from './WidgetSheets.module.scss';
import { responsiveWidget } from './widgets/registry';

type Sheet = { key: number; widgetId: string; options?: WidgetOptionValues };

const sheetsOf = (state: unknown): Sheet[] => (state as { sheets?: Sheet[] } | null)?.sheets ?? [];

// What the desktop opens in a floating window (an attachment, a PDF) is a
// full-screen sheet here. The sheets are kept in the history entry's state, so
// Back closes them and a reload keeps them.
function WidgetSheets({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const sheets = sheetsOf(location.state);

  const openWidget = useCallback(
    (widgetId: string, options?: WidgetOptionValues) => {
      const key = Math.max(-1, ...sheets.map((s) => s.key)) + 1;
      void navigate(location, { state: { sheets: [...sheets, { key, widgetId, options }] } });
      return key;
    },
    [location, navigate, sheets],
  );

  const closeWidget = useCallback(
    (key: number) => {
      if (sheets.at(-1)?.key === key) {
        void navigate(-1);
      } else if (sheets.some((s) => s.key === key)) {
        void navigate(location, {
          replace: true,
          state: { sheets: sheets.filter((s) => s.key !== key) },
        });
      }
    },
    [location, navigate, sheets],
  );

  const value = useMemo(() => ({ openWidget, closeWidget }), [openWidget, closeWidget]);

  return (
    <WidgetWindowContext value={value}>
      {children}
      {sheets.map((s) => (
        <SheetView key={s.key} sheet={s} onClose={closeWidget} />
      ))}
    </WidgetWindowContext>
  );
}

function SheetView({ sheet, onClose }: { sheet: Sheet; onClose: (key: number) => void }) {
  const widget = responsiveWidget(sheet.widgetId);
  const close = useCallback(() => onClose(sheet.key), [onClose, sheet.key]);
  const title = widget
    ? (widget.title?.(resolveOptions(widget.options, sheet.options)) ?? widget.name)
    : sheet.widgetId;

  return (
    <div role="dialog" aria-label={title} className={styles.sheet}>
      <header className={styles.header}>
        <button type="button" className="icon-btn" aria-label="Back" onClick={close}>
          <SymbolIcon name="arrow_back" />
        </button>
        <h2 className={styles.title}>{title}</h2>
      </header>
      <WidgetBody placement="window">
        {widget ? (
          <CurrentWidgetWindowContext value={close}>
            <WidgetContent widget={widget} options={sheet.options} />
          </CurrentWidgetWindowContext>
        ) : (
          <Alert severity="warning">Unknown widget “{sheet.widgetId}”</Alert>
        )}
      </WidgetBody>
    </div>
  );
}

export default WidgetSheets;
