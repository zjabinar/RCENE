import { Component, type ErrorInfo, type ReactNode } from "react";

import { ErrorState } from "./states.tsx";

export interface ErrorBoundaryProps {
  /** Shown instead of the default <ErrorState/> (which has a "Try again" that re-mounts the children). */
  fallback?: ReactNode;
  onError?: (error: unknown, info: ErrorInfo) => void;
  children?: ReactNode;
}

interface ErrorBoundaryState {
  failed: boolean;
  error: unknown;
}

/** Catches render errors below it, e.g. around a map or a chart, so the rest of the screen survives. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false, error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { failed: true, error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  reset = () => {
    this.setState({ failed: false, error: null });
  };

  render() {
    if (!this.state.failed) return this.props.children;
    return this.props.fallback ?? <ErrorState error={this.state.error} onRetry={this.reset} />;
  }
}
