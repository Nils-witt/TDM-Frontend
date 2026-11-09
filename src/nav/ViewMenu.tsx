import { type ChangeEvent, useRef } from 'react';
import Menu from '../components/menu/Menu';
import MenuItem from '../components/menu/MenuItem';
import MenuSeparator from '../components/menu/MenuSeparator';
import styles from './ViewMenu.module.scss';
import { builtinLayout, useLayoutView } from '../pages/dashboard/layoutContext';
import { exportLayout, parseLayoutFile } from '../pages/dashboard/layoutFile';

function ViewMenu() {
  const {
    layouts,
    active,
    select,
    canEdit,
    startEdit,
    startImport,
    remove,
    monitor,
    chooseMonitor,
    startArrangementEdit,
    editing,
    userDefault,
    setUserDefault,
    canWrite,
    setScope,
  } = useLayoutView();
  const importInput = useRef<HTMLInputElement>(null);
  const multiMonitor = active.monitors.length > 1;

  const makeDefault = () =>
    setUserDefault(active.id).catch((err: unknown) =>
      window.alert(err instanceof Error ? err.message : String(err)),
    );

  const shared = active.scope === 'global';

  // Making a shared layout personal hides it from everyone else.
  const toggleShared = () => {
    if (
      shared &&
      !window.confirm(`Make “${active.name}” your own? Other users will no longer see or use it.`)
    )
      return;
    setScope(active.id, shared ? 'user' : 'global').catch((err: unknown) =>
      window.alert(err instanceof Error ? err.message : String(err)),
    );
  };

  const removeActive = () => {
    if (!window.confirm(`Delete the layout “${active.name}”?`)) return;
    remove(active.id).catch((err: unknown) =>
      window.alert(err instanceof Error ? err.message : String(err)),
    );
  };

  // Opens the exported layout as a new layout to edit.
  const importFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      startImport(parseLayoutFile(await file.text()));
    } catch (err) {
      window.alert(
        `Cannot import ${file.name}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  return (
    <>
      <Menu trigger="View" tourId="view-menu">
        {[builtinLayout, ...layouts].map((l) => (
          <MenuItem
            key={l.id}
            disabled={editing}
            trailing={
              <>
                {l.monitors.length > 1 && (
                  <span className={styles.badge}>{l.monitors.length} monitors</span>
                )}
                {l.scope === 'global' && <span className={styles.badge}>Shared</span>}
                {l.id === userDefault && <span className={styles.badge}>Default</span>}
                {l.id === active.id && <span aria-label="active">✓</span>}
              </>
            }
            onClick={() => select(l.id)}
          >
            {l.name}
          </MenuItem>
        ))}
        {multiMonitor && (
          <>
            <MenuSeparator />
            <MenuItem disabled={editing || !monitor} onClick={() => chooseMonitor(null)}>
              {monitor ? `Monitor: ${monitor.name}…` : 'Choose Monitor…'}
            </MenuItem>
          </>
        )}
        <MenuSeparator />
        <MenuItem
          disabled={editing || active.id === userDefault}
          onClick={() => void makeDefault()}
        >
          Use as My Default
        </MenuItem>
        <MenuItem
          disabled={editing || !canEdit(active) || !monitor}
          onClick={() => startEdit(false)}
        >
          {multiMonitor ? 'Edit Monitor Layout' : 'Edit Layout'}
        </MenuItem>
        <MenuItem disabled={editing || !canEdit(active)} onClick={startArrangementEdit}>
          Edit Monitors…
        </MenuItem>
        <MenuItem disabled={editing} onClick={() => startEdit(true)}>
          New Layout…
        </MenuItem>
        {canWrite('global') && (
          <MenuItem disabled={editing || active.scope === 'builtin'} onClick={toggleShared}>
            {shared ? 'Make Personal…' : 'Share with Everyone'}
          </MenuItem>
        )}
        <MenuItem disabled={editing || !canEdit(active)} onClick={removeActive}>
          Delete Layout…
        </MenuItem>
        <MenuSeparator />
        <MenuItem disabled={editing} onClick={() => exportLayout(active)}>
          Export Layout…
        </MenuItem>
        <MenuItem disabled={editing} onClick={() => importInput.current?.click()}>
          Import Layout…
        </MenuItem>
      </Menu>
      <input
        ref={importInput}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(e) => void importFile(e)}
      />
    </>
  );
}

export default ViewMenu;
