import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            minHeight: '50vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              maxWidth: '480px',
              width: '100%',
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '36px 28px',
              border: '1.5px solid #E2E8F0',
              boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: '24px',
              }}
            >
              ⚠️
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
              Бетті жүктеу кезінде қате орын алды
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.6, marginBottom: '24px' }}>
              Бетті қайта жаңартып көріңіз немесе басты бетке оралыңыз.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={this.handleReload}
                className="btn-primary"
                style={{ padding: '10px 20px', fontSize: '13px' }}
              >
                Қайта жаңарту ⟳
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                style={{
                  padding: '10px 20px',
                  fontSize: '13px',
                  fontWeight: 700,
                  borderRadius: '50px',
                  border: '1.5px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                Басты бетке өту
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
