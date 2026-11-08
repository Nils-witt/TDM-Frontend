import { displayName, useSession } from '@/app/session';
import Menu from '@/components/menu/Menu';
import NavMenuItem from '../NavMenuItem';

// The account details are in the About dialog.
function UserMenu() {
  const { principal } = useSession();
  const name = displayName(principal);
  return (
    <Menu trigger={name} title={`Logged in as ${name}`} tourId="account">
      <NavMenuItem label="Account Details…" action="about" />
      <NavMenuItem label="Log Out" action="logout" />
    </Menu>
  );
}

export default UserMenu;
