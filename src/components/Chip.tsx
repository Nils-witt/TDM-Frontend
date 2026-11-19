import type { CSSProperties } from 'react';
import styles from './Chip.module.scss';

export type ChipTone = 'default' | 'red' | 'yellow' | 'green';

// title shows the whole label when it is cut off.
function Chip({
  label,
  tone = 'default',
  title,
  className,
  style,
}: {
  label: string;
  tone?: ChipTone;
  title?: string;
  className?: string;
  // A color of its own (a message tag's).
  style?: CSSProperties;
}) {
  const classes = [styles.chip, tone === 'default' ? '' : styles[tone], className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <span className={classes} title={title} style={style}>
      <span className={styles.label}>{label}</span>
    </span>
  );
}

export default Chip;
