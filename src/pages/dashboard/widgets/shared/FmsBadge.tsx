import { fmsStatusLabels, fmsTone } from '@/api/units';
import styles from './FmsBadge.module.scss';

// An FMS status code, colored by what it means; its label as the title.
function FmsBadge({ code }: { code: number }) {
  return (
    <span className={`${styles.badge} ${styles[fmsTone(code)]}`} title={fmsStatusLabels[code]}>
      {code}
    </span>
  );
}

export default FmsBadge;
