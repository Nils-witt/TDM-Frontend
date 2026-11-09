import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { useCatalogs } from '@/data/catalogContext';

// As LogbookTypeBadge: a type no longer in the catalog shows as "Unknown type".
export function LogbookTypeBadgeMUI({ typeId }: { typeId: string | null }) {
  const { logbookTypes } = useCatalogs();
  if (typeId === null) {
    return (
      <Typography component="span" variant="body2" color="text.secondary">
        No type
      </Typography>
    );
  }
  return <Chip size="small" label={logbookTypes.byId.get(typeId)?.name ?? 'Unknown type'} />;
}

export function FileTypeBadgeMUI({ typeId }: { typeId: string }) {
  const { fileTypes } = useCatalogs();
  return <Chip size="small" label={fileTypes.byId.get(typeId)?.name ?? 'Unknown type'} />;
}
