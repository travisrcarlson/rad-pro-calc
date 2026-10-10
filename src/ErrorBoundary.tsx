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
    console.error('Uncaught error in module:', error, errorInfo);
  }

  private handleHardReload = async () => {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      sessionStorage.clear();
    } catch (e) {
      console.warn('Cache clear error:', e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const errorMsg = this.state.error?.message || String(this.state.error || '');
      const isChunkError =
        errorMsg.includes('Failed to fetch dynamically imported module') ||
        errorMsg.includes('error loading dynamically imported module') ||
        errorMsg.includes('Importing a module script failed') ||
        this.state.error?.name === 'ChunkLoadError';

      if (isChunkError) {
        return (
          <div style={{
            padding: '28px',
            background: 'linear-gradient(135deg, rgba(14, 28, 48, 0.95), rgba(8, 16, 28, 0.98))',
            borderRadius: '12px',
            color: '#fff',
            border: '1px solid rgba(0, 229, 255, 0.4)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            maxWidth: '720px',
            margin: '30px auto',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2.4rem', marginBottom: '12px' }}>🔄</div>
            <h2 style={{ margin: '0 0 10px 0', color: 'var(--color-primary, #00e5ff)', fontSize: '1.4rem' }}>
              Application Update Detected
            </h2>
            <p style={{ color: 'var(--color-text-muted, #94a3b8)', fontSize: '0.95rem', lineHeight: '1.6', margin: '0 0 20px 0' }}>
              A new version of RadPro Analyst was deployed. Your browser session is attempting to load an outdated asset chunk that has been superseded on the server.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                style={{
                  padding: '10px 24px',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  backgroundColor: 'var(--color-primary, #00e5ff)',
                  color: '#050a12',
                  border: 'none',
                  borderRadius: '6px'
                }}
                onClick={() => window.location.reload()}
              >
                Reload & Load Latest Version
              </button>
              <button
                className="btn btn-secondary"
                style={{
                  padding: '10px 20px',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: '#e2e8f0',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px'
                }}
                onClick={this.handleHardReload}
              >
                Clear Cache & Refresh
              </button>
            </div>
          </div>
        );
      }

      return (
        <div style={{
          padding: '24px',
          backgroundColor: 'rgba(90, 30, 30, 0.85)',
          borderRadius: '10px',
          color: '#fff',
          border: '1px solid #ef4444',
          margin: '20px'
        }}>
          <h2 style={{ margin: '0 0 10px 0', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚠️</span> Something went wrong in this module.
          </h2>
          <pre style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            color: '#fecaca',
            background: 'rgba(0, 0, 0, 0.4)',
            padding: '14px',
            borderRadius: '6px',
            fontSize: '0.85rem',
            margin: '12px 0'
          }}>
            {this.state.error?.toString()}
          </pre>
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button
              style={{
                padding: '8px 18px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try Again
            </button>
            <button
              style={{
                padding: '8px 18px',
                backgroundColor: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600
              }}
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
