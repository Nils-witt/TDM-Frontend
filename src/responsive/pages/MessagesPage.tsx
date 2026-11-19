import { lazy, Suspense } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import type { MessageBox } from '@/api/messages';
import { activeTags } from '@/api/messageTags';
import Alert from '@/components/Alert';
import Spinner from '@/components/Spinner';
import SymbolIcon from '@/components/symbols/SymbolIcon';
import {
  boxLabels,
  parseBox,
  useMessagesView,
} from '@/pages/dashboard/widgets/Messages/messagesState';
import { responsivePaths } from '../paths';
import styles from './MissionsPage.module.scss';

// Lazy, so MUI stays out of the bundle the desktop loads.
const MessageListMUI = lazy(() => import('../widgets/MessagesMUI/MessageListMUI'));

// The chat of the session's scope, as the desktop's Messages widget: the
// box (?box=), Unacknowledged (?unack=1) and a tag (?tag=) are kept in the
// URL, so Back from a message restores the view. Online only.
function MessagesPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const box: MessageBox = parseBox(params.get('box')) ?? 'inbox';
  const unack = params.get('unack') === '1';
  const tag = params.get('tag') ?? '';
  const view = useMessagesView(box, tag, unack);
  const { access, chatEnabled, list } = view;

  const setParam = (key: 'box' | 'unack' | 'tag', value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const canCompose = access.send && !access.offline && chatEnabled !== false;
  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.headingRow}>
          <h1 className={styles.heading}>Messages</h1>
          {canCompose ? (
            <Link to={responsivePaths.newMessage} className={styles.create}>
              <SymbolIcon name="edit" />
              New
            </Link>
          ) : (
            <button type="button" className={styles.create} disabled>
              <SymbolIcon name="edit" />
              New
            </button>
          )}
        </div>
        <div className={styles.filters} role="group" aria-label="Box">
          {view.boxes.map((b) => (
            <button
              key={b}
              type="button"
              className={`${styles.filter}${b === view.box ? ` ${styles.selected}` : ''}`}
              aria-pressed={b === view.box}
              onClick={() => setParam('box', b === 'inbox' ? '' : b)}
            >
              {boxLabels[b]}
            </button>
          ))}
          <button
            type="button"
            className={`${styles.filter}${unack ? ` ${styles.selected}` : ''}`}
            aria-pressed={unack}
            onClick={() => setParam('unack', unack ? '' : '1')}
          >
            Unacknowledged
          </button>
          {activeTags(view.tags.data).length > 0 && (
            <select
              className={styles.filter}
              aria-label="Tag"
              value={tag}
              onChange={(e) => setParam('tag', e.target.value)}
            >
              <option value="">All tags</option>
              {activeTags(view.tags.data).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      {access.offline ? (
        <p className={styles.empty}>Messages are not available offline.</p>
      ) : chatEnabled === false ? (
        <p className={styles.empty}>The chat is disabled in this scope.</p>
      ) : list.error ? (
        <Alert severity="error">{list.error}</Alert>
      ) : list.data === undefined ? (
        <Spinner />
      ) : (
        <Suspense fallback={<Spinner />}>
          <MessageListMUI
            messages={list.data}
            functionId={access.functionId}
            tagsById={view.tagsById}
            onOpen={(m) => void navigate(responsivePaths.message(m.id))}
          />
        </Suspense>
      )}
    </div>
  );
}

export default MessagesPage;
