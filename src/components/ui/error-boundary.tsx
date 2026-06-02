"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-[#E5E7EB] bg-white py-12 text-center">
          <AlertTriangle className="h-8 w-8 text-[#FF4444] mb-3" />
          <h3 className="text-sm font-semibold text-[#111827]">
            {this.props.fallbackTitle ?? "Something went wrong"}
          </h3>
          <p className="mt-1 text-xs text-[#4B5563] max-w-sm">
            {this.props.fallbackDescription ?? "An unexpected error occurred. Please try again."}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={this.handleReset}
          >
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
