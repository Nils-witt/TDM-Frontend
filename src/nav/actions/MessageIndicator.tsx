import { menuItemClass } from '@/components/menu/menuClasses';
import SymbolIcon from '@/components/symbols/SymbolIcon';
import { useWidgetWindows } from '@/components/widgetWindow/widgetWindowContext';
import { useMessageAccess, useUnacknowledgedMessages } from '@/data/messages';
import styles from './MessageIndicator.module.scss';

// The messages the session's function has yet to acknowledge as To:
// hidden without messages.view, highlighted while one is pending, red for
// a priority I. A click opens the Messages widget on them.
function MessageIndicator() {
  const access = useMessageAccess();
  const { list, count } = useUnacknowledgedMessages();
  const { openWidget } = useWidgetWindows();
  if (!access.view) return null;

  const pending = count ?? 0;
  const urgent = (list.data ?? []).some((m) => m.priority === 1);
  const level = urgent ? styles.urgent : pending > 0 ? styles.pending : styles.none;
  const title = access.offline
    ? 'Messages are not available offline'
    : pending === 0
      ? 'No messages to acknowledge'
      : `${pending} message${pending === 1 ? '' : 's'} to acknowledge`;

  return (
    <button
      type="button"
      className={menuItemClass(`${styles.indicator} ${level}`)}
      title={title}
      aria-label={title}
      onClick={() => openWidget('Messages', { unacknowledged: pending > 0 })}
    >
      <SymbolIcon name="chat" className={styles.icon} />
      {pending > 0 && <span className={styles.count}>{pending}</span>}
    </button>
  );
}

export default MessageIndicator;
