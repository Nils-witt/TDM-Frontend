import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'material-symbols/outlined.css';
import './index.scss';
import App from './app/App.tsx';
import { loadConfig } from './api/client';
import { mobileBasePath, shouldRedirectToMobile } from './app/mobileRoute';

// Before the session starts, so a login returns to the mobile view.
if (shouldRedirectToMobile()) window.history.replaceState(null, '', mobileBasePath);

// The API URL must be known before the session's first request.
void loadConfig().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
