import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'material-symbols/outlined.css';
import './index.scss';
import App from './app/App.tsx';
import { loadConfig } from './api/client';

// The API URL must be known before the session's first request.
void loadConfig().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
