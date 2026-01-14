"use client";

import { Component, ReactNode } from "react";
import { Button } from "./ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary to catch and handle React errors gracefully
 * Prevents the entire app from crashing when a component errors
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    console.error("Error boundary caught an error:", error, errorInfo);

    // In production, you might want to log to an error tracking service
    // e.g., Sentry, LogRocket, etc.
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
          <div className="max-w-md w-full space-y-6 text-center">
            <div className="text-6xl">😕</div>
            <h1 className="text-2xl font-bold">Oops! Something went wrong</h1>
            <p className="text-muted-foreground">
              The app encountered an unexpected error. Don't worry, your game data is safe!
            </p>
            {this.state.error && (
              <details className="text-left text-sm bg-muted p-4 rounded-lg">
                <summary className="cursor-pointer font-semibold mb-2">
                  Error details
                </summary>
                <pre className="whitespace-pre-wrap break-words text-xs">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <div className="space-y-3">
              <Button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                }}
                className="w-full"
              >
                Try Again
              </Button>
              <Button
                onClick={() => {
                  window.location.href = "/";
                }}
                variant="outline"
                className="w-full"
              >
                Go to Home
              </Button>
              <Button
                onClick={() => {
                  window.location.reload();
                }}
                variant="ghost"
                className="w-full"
              >
                Reload App
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              If the problem persists, try refreshing the page or reinstalling the app.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
