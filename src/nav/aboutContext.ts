import { createContext, use } from 'react';

type AboutContextValue = {
  open: () => void;
};

export const AboutContext = createContext<AboutContextValue | null>(null);

export function useAbout(): AboutContextValue {
  const v = use(AboutContext);
  if (!v) throw new Error('useAbout outside of AboutProvider');
  return v;
}
