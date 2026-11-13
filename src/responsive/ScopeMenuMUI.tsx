import Divider from '@mui/material/Divider';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useCatalogs } from '@/data/catalogContext';
import { defaultScopeName, scopeOptions, useSelectedScope } from '@/data/selectedScope';

function ScopeMenuMUI({ anchor, onClose }: { anchor: HTMLElement; onClose: () => void }) {
  const { scopes } = useCatalogs();
  const { scopeId, setScope } = useSelectedScope();
  const options = scopeOptions(scopes.items);

  const pick = (id: string | null) => {
    setScope(id);
    onClose();
  };

  return (
    <Menu anchorEl={anchor} open onClose={onClose}>
      <MenuItem selected={scopeId === null} onClick={() => pick(null)}>
        {defaultScopeName}
      </MenuItem>
      {options.length > 0 && <Divider />}
      {options.map((s) => (
        <MenuItem key={s.id} selected={scopeId === s.id} onClick={() => pick(s.id)}>
          {s.name}
        </MenuItem>
      ))}
    </Menu>
  );
}

export default ScopeMenuMUI;
