import { useState } from 'react';
import type { Principal } from '@/api/auth';
import { login, loginWithCertificate } from '@/auth/session';
import Alert from '@/components/Alert';
import styles from './Login.module.scss';

type Props = {
  error: string | null;
  onCertificate: (principal: Principal) => void;
};

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

function Login({ error, onCertificate }: Props) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const run = (attempt: () => Promise<void>) => {
    setBusy(true);
    setFailed(null);
    attempt().catch((err: unknown) => {
      setBusy(false);
      setFailed(message(err));
    });
  };

  // On success the browser leaves for Authentik.
  const startOidc = () => run(login);

  const startCertificate = () => run(async () => onCertificate(await loginWithCertificate()));

  const shown = failed ?? error;
  return (
    <main className={`container ${styles.narrow}`}>
      <div className="card">
        <h1 className="small">Universam</h1>
        {shown && <Alert severity="error">{shown}</Alert>}
        <div className={styles.actions}>
          <button type="button" className="btn primary" disabled={busy} onClick={startOidc}>
            Log In with Authentik
          </button>
          <button type="button" className="btn" disabled={busy} onClick={startCertificate}>
            Log In with Client Certificate
          </button>
        </div>
      </div>
    </main>
  );
}

export default Login;
