import { Component, type ReactNode } from 'react'
import * as Sentry from "@sentry/react";

export class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, { extra: errorInfo as unknown as Record<string, unknown> });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-surface-low rounded-[40px] text-on-surface/40 flex flex-col items-center justify-center space-y-2">
          <p className="font-bold italic text-xs">COMPONENT LOAD ERROR</p>
          <p className="text-[10px] uppercase tracking-widest opacity-50">Static bypass activated</p>
          <button 
            onClick={() => Sentry.showReportDialog()}
            className="mt-2 text-[10px] underline uppercase tracking-widest opacity-30 hover:opacity-100"
          >
            Report feedback
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
