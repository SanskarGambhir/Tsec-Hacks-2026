import { Component } from "react";

/**
 * Stops one broken component from blanking the whole app.
 *
 * React unmounts the entire tree on an uncaught render error, which previously
 * left users staring at a white page with no way back.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled UI error:", error, info?.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full space-y-4 text-center">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="text-muted-foreground">
            This page hit an unexpected error. Reloading usually clears it.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={() => window.location.assign("/dashboard")}
              className="px-4 py-2 rounded-xl border border-border font-medium"
            >
              Go to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
}
