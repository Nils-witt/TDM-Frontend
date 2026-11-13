import Menu from '@/components/menu/Menu';
import MenuItem from '@/components/menu/MenuItem';
import MenuSeparator from '@/components/menu/MenuSeparator';
import { useCatalogs } from '@/data/catalogContext';
import { globalScopeName, scopeOptions, useSelectedScope } from '@/data/selectedScope';

// The mission scope of this tab, which new missions are created in.
function ScopeMenu() {
  const { scopes } = useCatalogs();
  const { scopeId, scope, setScope } = useSelectedScope();
  const name = scope?.name ?? globalScopeName;
  const options = scopeOptions(scopes.items);

  return (
    <Menu
      trigger={name}
      label={`Scope: ${name}`}
      title={`New missions are created in ${name}`}
      tourId="scope"
    >
      <MenuItem checked={scopeId === null} onClick={() => setScope(null)}>
        {globalScopeName}
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
