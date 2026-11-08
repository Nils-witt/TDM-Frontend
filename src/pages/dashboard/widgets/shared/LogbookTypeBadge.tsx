import { useCatalogs } from '@/data/catalogContext';
import styles from './LogbookTypeBadge.module.scss';

// A type no longer in the catalog (deleted) shows as "Unknown type".
export function LogbookTypeBadge({ typeId }: { typeId: string | null }) {
  const { logbookTypes } = useCatalogs();
  if (typeId === null) return <span className="muted">No type</span>;
  return (
    <span className={styles.badge}>{logbookTypes.byId.get(typeId)?.name ?? 'Unknown type'}</span>
  );
}

export function FileTypeBadge({ typeId }: { typeId: string }) {
  const { fileTypes } = useCatalogs();
  return <span className={styles.badge}>{fileTypes.byId.get(typeId)?.name ?? 'Unknown type'}</span>;
}
