import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{ padding: '20px', backgroundColor: '#5a1e1e', borderRadius: '8px', color: '#fff', border: '1px solid #ff4a4a' }}>
          <h2>Something went wrong in this module.</h2>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#ffb3b3', marginTop: '10px' }}>
            {this.state.error?.toString()}
          </pre>
          <button 
            style={{ marginTop: '15px', padding: '8px 16px', backgroundColor: '#333', color: '#fff', border: '1px solid #777', cursor: 'pointer' }}
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
