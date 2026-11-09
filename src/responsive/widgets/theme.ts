import { createTheme } from '@mui/material/styles';

// The colors of src/styles/_tokens.scss, so the MUI widgets match the rest of
// the responsive UI. The scheme follows the system, as the tokens do.
export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'media' },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#1976d2', dark: '#1565c0', contrastText: '#fff' },
        success: { main: '#2e7d32' },
        warning: { main: '#ed6c02' },
        error: { main: '#d32f2f' },
        background: { default: '#fff', paper: '#fff' },
        text: {
          primary: 'rgba(0, 0, 0, 0.87)',
          secondary: 'rgba(0, 0, 0, 0.6)',
          disabled: 'rgba(0, 0, 0, 0.38)',
        },
        divider: 'rgba(0, 0, 0, 0.12)',
      },
    },
    dark: {
      palette: {
        primary: { main: '#90caf9', dark: '#42a5f5', contrastText: 'rgba(0, 0, 0, 0.87)' },
        success: { main: '#66bb6a' },
        warning: { main: '#ffa726' },
        error: { main: '#f44336' },
        background: { default: '#121212', paper: '#1e1e1e' },
        text: {
          primary: '#fff',
          secondary: 'rgba(255, 255, 255, 0.7)',
          disabled: 'rgba(255, 255, 255, 0.5)',
        },
        divider: 'rgba(255, 255, 255, 0.12)',
      },
    },
  },
  shape: { borderRadius: 4 },
  typography: { fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
});
