import { Component, type ReactNode } from 'react';
import Alert from '@/components/Alert';

// The messages browsers and Vite fail a lazy import with: Chromium, Firefox,
// Safari, and Vite's CSS preload.
const chunkErrorPattern =
  /dynamically imported module|Importing a module script failed|Unable to preload CSS/i;

const isChunkError = (error: unknown) =>
  error instanceof Error && chunkErrorPattern.test(error.message);

type State = { error: unknown };

// Keeps a failing widget from taking down the dashboard. A failed chunk load
// means a tab opened before a server update asks for code files the new
// build no longer has; only a reload fetches the current ones.
class WidgetErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  render() {
    const { error } = this.state;
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
          The app was updated. Reload the page to load this widget.
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
        This widget failed: {error instanceof Error ? error.message : String(error)}
      </Alert>
    );
  }
}

export default WidgetErrorBoundary;
