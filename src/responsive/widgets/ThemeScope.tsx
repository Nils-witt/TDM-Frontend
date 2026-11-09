import { ThemeProvider } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { theme } from './theme';

// Its own module, loaded lazily, so MUI stays out of the bundle the desktop
// loads.
function ThemeScope({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

export default ThemeScope;
