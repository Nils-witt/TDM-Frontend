import { describe, expect, it } from 'vitest';
import ErrorBoundary from './ErrorBoundary';

describe('ErrorBoundary state', () => {
  const props = (resetKey: unknown) => ({ children: null, what: 'page', resetKey });

  it('keeps the error while the reset key stays', () => {
    const state = { error: new Error('x'), resetKey: '/m/map' };
    expect(ErrorBoundary.getDerivedStateFromProps(props('/m/map'), state)).toBeNull();
  });

  it('clears the error when the reset key changes', () => {
    const state = { error: new Error('x'), resetKey: '/m/map' };
    expect(ErrorBoundary.getDerivedStateFromProps(props('/m/missions'), state)).toEqual({
      error: null,
      resetKey: '/m/missions',
    });
  });
});
