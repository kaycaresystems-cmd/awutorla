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

// Error boundaries must be class components — React has no hook equivalent (yet).
// Without this, any uncaught render error anywhere in the tree white-screens the
// whole app with no way back except a manual browser refresh the user has to guess.
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
          <div className="space-y-5 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
              <AlertTriangle size={22} />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-semibold text-gray-900">Something went wrong</h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                The Maison L'Atelier app hit an unexpected error. Your data is safe — reloading
                usually resolves this.
              </p>
            </div>
            <button
              onClick={this.handleReload}
              className="w-full py-2.5 rounded-lg text-sm font-semibold bg-gray-900 text-white hover:bg-accent-600 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw size={15} />
              <span>Reload App</span>
            </button>
          </div>
        </CenteredCardShell>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
