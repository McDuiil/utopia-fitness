import React, { Component, ReactNode, ErrorInfo } from "react";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

declare global {
  interface Window {
    __reportError?: (error: any, info?: any) => void;
    __ERROR_LOGS__?: any[];
  }
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.name || 'Unknown'}]`, error, info);

    // Reporting to global handler (Phase 3 will set this up)
    if (window.__reportError) {
      window.__reportError(error, info);
    }
  }

  componentDidUpdate(prevProps: Props) {
    // Recovery mechanism: if children change, try to reset error state
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-center space-y-2">
            <p className="text-xs font-bold text-red-400 uppercase tracking-widest">
              {this.props.name ? `${this.props.name} Error` : "Component Error"}
            </p>
            <p className="text-[10px] text-white/40">
              Something went wrong. Try switching dates or refreshing.
            </p>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
