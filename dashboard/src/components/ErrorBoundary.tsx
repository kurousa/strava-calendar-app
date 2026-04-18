import { Component, type ReactNode } from 'react'

export class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-surface-low rounded-[40px] text-on-surface/40 flex flex-col items-center justify-center space-y-2">
          <p className="font-bold italic text-xs">COMPONENT LOAD ERROR</p>
          <p className="text-[10px] uppercase tracking-widest opacity-50">Static bypass activated</p>
        </div>
      );
    }
    return this.props.children;
  }
}
