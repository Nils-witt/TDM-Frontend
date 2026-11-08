import type { ReactNode } from 'react';
import { CloseIcon } from './icons';
import styles from './Alert.module.scss';

type Props = {
  severity: 'error' | 'warning' | 'success';
  children: ReactNode;
  action?: ReactNode;
  onClose?: () => void;
  className?: string;
};

function Alert({ severity, children, action, onClose, className }: Props) {
  return (
    <div
      role={severity === 'success' ? 'status' : 'alert'}
      className={`${styles.alert} ${styles[severity]} ${className ?? ''}`}
    >
      <div className={styles.message}>{children}</div>
      {action}
      {onClose && (
        <button
          type="button"
          className="icon-btn"
          aria-label="Close"
          title="Close"
          onClick={onClose}
        >
          <CloseIcon />
        </button>
      )}
    </div>
  );
}

export default Alert;
