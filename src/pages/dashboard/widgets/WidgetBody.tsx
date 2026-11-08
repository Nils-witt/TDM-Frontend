import { type ReactNode, useState } from 'react';
import { WidgetActionSlotContext } from './widgetActionSlot';
import styles from './WidgetBody.module.scss';

// The action slot is hidden while empty. While inert (the layout is edited)
// neither part reacts.
function WidgetBody({
  placement,
  inert,
  children,
}: {
  placement: 'frame' | 'window';
  inert?: boolean;
  children: ReactNode;
}) {
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);
  return (
    <>
      <div className={`${styles.actions} ${styles[placement]}`} ref={setSlot} inert={inert} />
      <div className={`${styles.body} ${styles[placement]}`} inert={inert}>
        <WidgetActionSlotContext value={slot}>{children}</WidgetActionSlotContext>
      </div>
    </>
  );
}

export default WidgetBody;
