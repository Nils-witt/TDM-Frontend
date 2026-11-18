import styles from './Chip.module.scss';

export type ChipTone = 'default' | 'red' | 'yellow' | 'green';

// title shows the whole label when it is cut off.
function Chip({
  label,
  tone = 'default',
  title,
  className,
}: {
  label: string;
  tone?: ChipTone;
  title?: string;
  className?: string;
}) {
  const classes = [styles.chip, tone === 'default' ? '' : styles[tone], className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <span className={classes} title={title}>
      <span className={styles.label}>{label}</span>
    </span>
  );
}

export default Chip;
