import { Component, type ReactNode } from 'react';
import Alert from '@/components/Alert';

// The messages browsers and Vite fail a lazy import with: Chromium, Firefox,
// Safari, and Vite's CSS preload.
const chunkErrorPattern =
  /dynamically imported module|Importing a module script failed|Unable to preload CSS/i;

const isChunkError = (error: unknown) =>
  error instanceof Error && chunkErrorPattern.test(error.message);

type Props = {
  children: ReactNode;
  // Names what failed in the message: "widget", "page", "app".
  what: string;
  // A change clears the error, as when the user navigates to another page.
  resetKey?: unknown;
};

type State = { error: unknown; resetKey: unknown };

// Keeps a failing part from taking down the rest. A failed chunk load means a
// tab opened before a server update asks for code files the new build no
// longer has; only a reload fetches the current ones.
class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return Object.is(props.resetKey, state.resetKey)
      ? null
      : { error: null, resetKey: props.resetKey };
  }

  render() {
    const { error } = this.state;
    const { what } = this.props;
    if (error === null) return this.props.children;
    if (isChunkError(error)) {
      return (
        <Alert
          severity="warning"
          action={
            <button type="button" className="btn small" onClick={() => location.reload()}>
              Reload
            </button>
          }
        >
          The app was updated. Reload the page to load this {what}.
        </Alert>
      );
    }
    return (
      <Alert
        severity="error"
        className="break"
        action={
          <button
            type="button"
            className="btn small"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        }
      >
        This {what} failed: {error instanceof Error ? error.message : String(error)}
      </Alert>
    );
  }
}

export default ErrorBoundary;
