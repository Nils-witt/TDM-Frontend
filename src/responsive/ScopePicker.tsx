import { lazy, Suspense, useState } from 'react';
import SymbolIcon from '@/components/symbols/SymbolIcon';
import { selectedScopeName, selectedScopeTitle, useSelectedScope } from '@/data/selectedScope';
import styles from './ScopePicker.module.scss';

// The menu's MUI parts load only once it is opened.
const ScopeMenuMUI = lazy(() => import('./ScopeMenuMUI'));

// The header's counterpart of the menu bar's ScopeMenu: the mission scope of
// this tab, which new missions are created in.
function ScopePicker() {
  const selected = useSelectedScope();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const name = selectedScopeName(selected);

  return (
    <>
      <button
        type="button"
        className={`icon-btn ${styles.button}`}
        aria-label={`Scope: ${name}`}
        aria-haspopup="menu"
        title={selectedScopeTitle(selected)}
        onClick={(e) => setAnchor(e.currentTarget)}
      >
        <span className={styles.name}>{name}</span>
        <SymbolIcon name="arrow_drop_down" />
      </button>
      {anchor && (
        <Suspense fallback={null}>
          <ScopeMenuMUI anchor={anchor} onClose={() => setAnchor(null)} />
        </Suspense>
      )}
    </>
  );
}

export default ScopePicker;
