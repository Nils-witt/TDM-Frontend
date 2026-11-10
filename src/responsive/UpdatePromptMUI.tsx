import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import type { UpdatePromptViewProps } from '@/app/update/UpdatePrompt';
import ThemeScope from './widgets/ThemeScope';

// At the top, as the bottom tab bar takes the bottom on phones.
function UpdatePromptMUI({ onReload, onDismiss }: UpdatePromptViewProps) {
  return (
    <ThemeScope>
      <Snackbar
        open
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        message="A new version of Universam is available."
        action={
          <>
            <Button color="inherit" size="small" onClick={onDismiss}>
              Later
            </Button>
            <Button color="primary" size="small" variant="contained" onClick={onReload}>
              Reload
            </Button>
          </>
        }
      />
    </ThemeScope>
  );
}

export default UpdatePromptMUI;
