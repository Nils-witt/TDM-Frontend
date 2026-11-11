import { useState } from 'react';
import type { Overlay } from '@/api/maps';
import { compactControls } from '@/components/form';
import WidgetActionBar, { WidgetAction } from '../shared/WidgetActionBar';
import styles from './Map.module.scss';
import { defaultOverlayState, type OverlayState } from './overlayState';

type Props = {
  overlays: readonly Overlay[];
  state: Readonly<Record<string, OverlayState>>;
  onChange: (id: string, state: OverlayState) => void;
};

// Toggled from the widget's action bar, the list floats over the map; it
// starts closed.
function OverlaySwitcher({ overlays, state, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const active = overlays.filter((o) => state[o.id]?.on).length;

  return (
    <>
      <WidgetActionBar label="Map">
        <WidgetAction
          pressed={open}
          title={open ? 'Hide overlays' : 'Show overlays'}
          onClick={() => setOpen((o) => !o)}
        >
          Overlays{active > 0 && ` (${active})`}
        </WidgetAction>
      </WidgetActionBar>
      {open && (
        <div className={styles.overlays}>
          <ul className={`${styles.overlayList} ${compactControls}`}>
            {overlays.map((o) => {
              const s = state[o.id] ?? defaultOverlayState;
              return (
                <li key={o.id} className={styles.overlayItem}>
                  <label className={styles.overlayName} title={o.description || undefined}>
                    <input
                      type="checkbox"
                      checked={s.on}
                      onChange={(e) => onChange(o.id, { ...s, on: e.target.checked })}
                    />
                    <span>{o.name || o.id}</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={s.opacity}
                    disabled={!s.on}
                    aria-label={`Opacity of ${o.name || o.id}`}
                    onChange={(e) => onChange(o.id, { ...s, opacity: Number(e.target.value) })}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}

export default OverlaySwitcher;
