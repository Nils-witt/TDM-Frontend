import { type ReactNode, useMemo, useRef } from 'react';
import AboutDialog from './actions/AboutDialog';
import { AboutContext } from './aboutContext';

// The dialog lives here, not in the menu item that opened it, so closing the
// menu does not close it.
function AboutProvider({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const value = useMemo(() => ({ open: () => ref.current?.showModal() }), []);

  return (
    <AboutContext value={value}>
      {children}
      <AboutDialog ref={ref} />
    </AboutContext>
  );
}

export default AboutProvider;
