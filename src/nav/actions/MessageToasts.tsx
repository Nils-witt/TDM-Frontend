import { useEffect, useEffectEvent, useState } from 'react';
import { addressLine, type Message } from '@/api/messages';
import { useWidgetWindows } from '@/components/widgetWindow/widgetWindowContext';
import { toastTimeout, useMessageArrivals, usePriorityLabel } from '@/data/messages';
import styles from './MessageToasts.module.scss';

// A toast per message that arrives for the session's function (To or CC)
// while the app is open; Open shows it in the Messages widget.
function MessageToasts() {
  const [shown, setShown] = useState<Message[]>([]);
  const { openWidget } = useWidgetWindows();
  useMessageArrivals((arrived) => setShown((s) => [...arrived, ...s].slice(0, 5)));
  const dismiss = (id: string) => setShown((s) => s.filter((m) => m.id !== id));
  if (shown.length === 0) return null;
  return (
    <div className={styles.stack} role="status" aria-live="polite">
      {shown.map((m) => (
        <Toast
          key={m.id}
          message={m}
          onOpen={() => {
            openWidget('Messages', { messageId: m.id });
            dismiss(m.id);
          }}
          onDismiss={() => dismiss(m.id)}
        />
      ))}
    </div>
  );
}

function Toast({
  message: m,
  onOpen,
  onDismiss,
}: {
  message: Message;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const label = usePriorityLabel(m.priority);
  const close = useEffectEvent(onDismiss);
  const timeout = toastTimeout(m);
  useEffect(() => {
    if (timeout === null) return;
    const t = window.setTimeout(close, timeout);
    return () => window.clearTimeout(t);
  }, [timeout]);
  return (
    <div className={`${styles.toast} ${m.priority <= 2 ? styles.urgent : ''}`}>
      <div className={styles.head}>
        <strong>{label}</strong> · {addressLine(m)}
      </div>
      <div className={styles.text}>{m.text}</div>
      <div className={styles.actions}>
        <button type="button" className="btn" onClick={onDismiss}>
          Dismiss
        </button>
        <button type="button" className="btn primary" onClick={onOpen}>
          Open
        </button>
      </div>
    </div>
  );
}

export default MessageToasts;
