import styles from './SymbolIcon.module.scss';

// The font is bundled with the app, so icons work offline.
function SymbolIcon({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${styles.icon} ${className}`} aria-hidden="true">
      {name}
    </span>
  );
}

export default SymbolIcon;
