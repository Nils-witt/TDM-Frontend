import { useNavigate } from 'react-router';
import { useDefaultOverlayStates, useOverlays } from '@/api/maps';
import { preferDesktop } from '@/app/mobileRoute';
import { displayName, isAdmin, useSession } from '@/app/session';
import Alert from '@/components/Alert';
import SymbolIcon from '@/components/symbols/SymbolIcon';
import { defaultOverlayState } from '@/pages/dashboard/widgets/Map/overlayState';
import { setOverlay, useOverlaySettings } from '../overlaySettings';
import styles from './SettingsPage.module.scss';

// What the Map tab draws over its base map, from the API's tile server. Hidden
// when the API has none.
function OverlaySettings() {
  const { overlays, error } = useOverlays();
  const state = useOverlaySettings();
  const defaults = useDefaultOverlayStates();
  if (error) return <Alert severity="warning">Overlays: {error}</Alert>;
  if (!overlays?.enabled || overlays.overlays.length === 0) return null;
  return (
    <section className={styles.section} aria-labelledby="settings-overlays">
      <h2 id="settings-overlays" className={styles.legend}>
        Map overlays
      </h2>
      <ul className={styles.list}>
        {overlays.overlays.map((o) => {
          const s = state[o.id] ?? defaults[o.id] ?? defaultOverlayState;
          const name = o.name || o.id;
          return (
            <li key={o.id} className={styles.overlay}>
              <label className={styles.overlayName}>
                <span className={styles.text}>
                  <span>{name}</span>
                  {o.description && <span className={styles.secondary}>{o.description}</span>}
                </span>
                <input
                  type="checkbox"
                  className={styles.switch}
                  role="switch"
                  checked={s.on}
                  onChange={(e) => setOverlay(o.id, { ...s, on: e.target.checked })}
                />
              </label>
              {s.on && (
                <label className={styles.opacity}>
                  <span className={styles.secondary}>Opacity</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={s.opacity}
                    aria-label={`Opacity of ${name}`}
                    onChange={(e) => setOverlay(o.id, { ...s, opacity: Number(e.target.value) })}
                  />
                  <span className={styles.percent}>{Math.round(s.opacity * 100)} %</span>
                </label>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SettingsPage() {
  const { principal, mode, logout } = useSession();
  const navigate = useNavigate();

  // Remembered in this browser, so opening / on this phone no longer sends it
  // back here; the desktop's Universam → Responsive View undoes it.
  const toDesktop = () => {
    preferDesktop(true);
    void navigate('/');
  };

  const signOut = () => {
    logout().catch((err: unknown) =>
      window.alert(`Cannot log out: ${err instanceof Error ? err.message : String(err)}`),
    );
  };

  const account: [string, string | undefined][] = [
    ['Name', displayName(principal)],
    ['Username', principal.username],
    ['Email', principal.email],
    ['Signed in with', mode === 'proxy' ? 'Client certificate' : 'Authentik'],
    ['Groups', principal.groups.join(', ') || undefined],
    ['Role', isAdmin(principal) ? 'Administrator' : undefined],
  ];

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Settings</h1>

      <section className={styles.section} aria-labelledby="settings-account">
        <h2 id="settings-account" className={styles.legend}>
          Account
        </h2>
        <dl className={styles.list}>
          {account.map(
            ([label, value]) =>
              value && (
                <div key={label} className={styles.row}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ),
          )}
        </dl>
      </section>

      <OverlaySettings />

      <section className={styles.section} aria-labelledby="settings-view">
        <h2 id="settings-view" className={styles.legend}>
          View
        </h2>
        <div className={styles.list}>
          <button type="button" className={styles.action} onClick={toDesktop}>
            <SymbolIcon name="desktop_windows" />
            <span className={styles.text}>
              <span>Desktop view</span>
              <span className={styles.secondary}>
                Opens the dashboard and keeps it on this device
              </span>
            </span>
            <SymbolIcon name="chevron_right" />
          </button>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="settings-session">
        <h2 id="settings-session" className={styles.legend}>
          Session
        </h2>
        <div className={styles.list}>
          <button type="button" className={`${styles.action} ${styles.danger}`} onClick={signOut}>
            <SymbolIcon name="logout" />
            <span className={styles.text}>Log out</span>
          </button>
        </div>
      </section>
    </div>
  );
}

export default SettingsPage;
