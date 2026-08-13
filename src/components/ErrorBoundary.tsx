import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { CenteredCardShell } from './ui/CenteredCardShell';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught render error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <CenteredCardShell>
          <div className="space-y-6 text-center animate-in fade-in">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shadow-sm">
              <AlertTriangle size={26} />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-accent-950 font-display">Something went wrong</h1>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed font-sans">
                The atelier app encountered an unexpected state. Your local and offline records remain secure — refreshing the studio session will restore normal operation.
              </p>
            </div>
            <button
              onClick={this.handleReload}
              className="w-full py-3 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-accent-800 to-accent-600 hover:from-accent-700 text-white shadow-md shadow-accent-900/15 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw size={15} className="text-gold-300" />
              <span>Reload Atelier App</span>
            </button>
          </div>
        </CenteredCardShell>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
