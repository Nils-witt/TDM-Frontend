import type { KeyboardEvent } from 'react';

// Cmd+Enter (Ctrl+Enter off macOS) while focus is inside the form. Use as
// onKeyDown; the submit handler still decides whether there is anything to
// save.
export function submitOnModEnter(e: KeyboardEvent<HTMLFormElement>) {
  if (e.key !== 'Enter' || !(e.metaKey || e.ctrlKey) || e.nativeEvent.isComposing) return;
  e.preventDefault();
  e.currentTarget.requestSubmit();
}
