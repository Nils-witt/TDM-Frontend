import { lazy, Suspense } from 'react';
import { Link, useParams } from 'react-router';
import { messagePath, useMessage } from '@/api/messages';
import { useMessageTags } from '@/api/messageTags';
import { useResourceCache } from '@/api/resource';
import Alert from '@/components/Alert';
import Spinner from '@/components/Spinner';
import { useMessageAccess } from '@/data/messages';
import { responsivePaths } from '../paths';
import styles from './WidgetPage.module.scss';

const MessageDetailMUI = lazy(() => import('../widgets/MessagesMUI/MessageDetailMUI'));

// One message of the scope; Back returns to the list as it was.
function MessagePage() {
  const { id = '' } = useParams();
  const access = useMessageAccess();
  const message = useMessage(access.load ? id : null);
  const tags = useMessageTags(access.load);
  const cache = useResourceCache();
  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>
        <Link to={responsivePaths.messages}>Messages</Link> / Message
      </h1>
      {access.offline ? (
        <p className="muted">Messages are not available offline.</p>
      ) : message.error ? (
        <Alert severity="error">{message.error}</Alert>
      ) : !message.data ? (
        <Spinner />
      ) : (
        <Suspense fallback={<Spinner />}>
          <MessageDetailMUI
            message={message.data}
            tags={tags.data ?? []}
            onChanged={(m) => cache.put(messagePath(m.id), m)}
          />
        </Suspense>
      )}
    </div>
  );
}

export default MessagePage;
