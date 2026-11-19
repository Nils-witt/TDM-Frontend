import { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router';
import Spinner from '@/components/Spinner';
import { responsivePaths } from '../paths';
import styles from './WidgetPage.module.scss';

const MessageComposeMUI = lazy(() => import('../widgets/MessagesMUI/MessageComposeMUI'));

// The sent message's page replaces this one in the history.
function NewMessagePage() {
  const navigate = useNavigate();
  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>New message</h1>
      <Suspense fallback={<Spinner />}>
        <MessageComposeMUI
          onSent={(m) => void navigate(responsivePaths.message(m.id), { replace: true })}
        />
      </Suspense>
    </div>
  );
}

export default NewMessagePage;
