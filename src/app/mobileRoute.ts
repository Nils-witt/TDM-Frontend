// Phones opening / are sent to the responsive UI (/m) unless they chose the desktop view
// there; the choice stays in this browser.
const preferDesktopKey = 'universam.preferDesktop';

export const mobileBasePath = '/m';

const smallTouchScreen = '(max-width: 768px) and (pointer: coarse)';

export function shouldRedirectToMobile(): boolean {
  if (window.location.pathname !== '/') return false;
  if (!window.matchMedia(smallTouchScreen).matches) return false;
  try {
    return localStorage.getItem(preferDesktopKey) === null;
  } catch {
    return true;
  }
}

export function preferDesktop(on: boolean) {
  try {
    if (on) localStorage.setItem(preferDesktopKey, '1');
    else localStorage.removeItem(preferDesktopKey);
  } catch {
    // Without storage the redirect just happens again next time.
  }
}
