import styles from './Spinner.module.scss';

function Spinner({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`${styles.center}${compact ? ` ${styles.compact}` : ''}`}>
      <div className={styles.spinner} role="progressbar" aria-label="Loading" />
    </div>
  );
}

export default Spinner;
