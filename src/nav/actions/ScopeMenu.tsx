import Menu from '@/components/menu/Menu';
import MenuItem from '@/components/menu/MenuItem';
import MenuSeparator from '@/components/menu/MenuSeparator';
import { useCatalogs } from '@/data/catalogContext';
import {
  defaultScopeName,
  globalScopeName,
  scopeOptions,
  selectedScopeName,
  selectedScopeTitle,
  useSelectedScope,
} from '@/data/selectedScope';

// The mission scope of this tab, which new missions are created in.
function ScopeMenu() {
  const { scopes } = useCatalogs();
  const selected = useSelectedScope();
  const { scopeId, global, setScope, setGlobal } = selected;
  const name = selectedScopeName(selected);
  const options = scopeOptions(scopes.items);

  return (
    <Menu
      trigger={name}
      label={`Scope: ${name}`}
      title={selectedScopeTitle(selected)}
      tourId="scope"
    >
      <MenuItem checked={global} onClick={setGlobal}>
        {globalScopeName}
      </MenuItem>
      <MenuSeparator />
      <MenuItem checked={!global && scopeId === null} onClick={() => setScope(null)}>
        {defaultScopeName}
      </MenuItem>
      {options.length > 0 && <MenuSeparator />}
      {options.map((s) => (
        <MenuItem key={s.id} checked={scopeId === s.id} onClick={() => setScope(s.id)}>
          {s.name}
        </MenuItem>
      ))}
    </Menu>
  );
}

export default ScopeMenu;
