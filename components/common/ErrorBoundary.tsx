import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Icon } from '../Icons';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-secondary p-4 text-center">
          <div className="bg-card p-8 rounded-2xl shadow-xl max-w-md w-full border border-border">
            <div className="text-red-500 mb-4 flex justify-center">
                <Icon name="zap" className="h-12 w-12" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Something went wrong</h1>
            <p className="text-muted-foreground mb-6">
              The application encountered an unexpected error.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-primary text-primary-foreground font-bold py-3 px-4 rounded-lg hover:bg-primary/90 transition-colors active:scale-95"
            >
              Reload Application
            </button>
            {this.state.error && (
                <details className="mt-4 text-left text-xs text-muted-foreground bg-secondary p-2 rounded overflow-auto max-h-32">
                    <summary>Error Details</summary>
                    <pre className="mt-1">{this.state.error.toString()}</pre>
                </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}