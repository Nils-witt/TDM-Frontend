import { useState } from 'react';
import { login } from '@/auth/session';
import Alert from '@/components/Alert';
import styles from './Login.module.scss';

function Login({ error }: { error: string | null }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const start = () => {
    setBusy(true);
    setFailed(null);
    // On success the browser leaves for Authentik.
    login().catch((err: unknown) => {
      setBusy(false);
      setFailed(err instanceof Error ? err.message : String(err));
    });
  };

  const shown = failed ?? error;
  return (
    <main className={`container ${styles.narrow}`}>
      <div className="card">
        <h1 className="small">Universam</h1>
        {shown && <Alert severity="error">{shown}</Alert>}
        <button type="button" className="btn primary mt" disabled={busy} onClick={start}>
          Log In with Authentik
        </button>
      </div>
    </main>
  );
}

export default Login;
