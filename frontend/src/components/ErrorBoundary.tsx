import React, { Component, ReactNode } from 'react';
import { captureError } from '../config/sentry';
import './ErrorBoundary.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Report to Sentry
    captureError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary__content">
            <h1 className="error-boundary__title">問題が発生しました</h1>
            <p className="error-boundary__message">
              申し訳ございません。予期しないエラーが発生しました。
            </p>
            <div className="error-boundary__actions">
              <button 
                className="error-boundary__button error-boundary__button--primary"
                onClick={this.handleReset}
              >
                ホームに戻る
              </button>
              <button 
                className="error-boundary__button error-boundary__button--secondary"
                onClick={() => window.location.reload()}
              >
                ページを再読み込み
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-boundary__details">
                <summary>エラーの詳細</summary>
                <pre>{this.state.error.stack}</pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;