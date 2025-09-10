import React from 'react';
import Button from './ui/Button';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: null
    };
  }

  static getDerivedStateFromError(error) {
    // Categorize the error
    let errorType = 'unknown';
    if (error instanceof TypeError) {
      errorType = 'type';
    } else if (error.name === 'NetworkError' || error.message.includes('network')) {
      errorType = 'network';
    } else if (error.name === 'SyntaxError') {
      errorType = 'syntax';
    }

    return {
      hasError: true,
      errorType,
      error
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to your error tracking service
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // You can add error reporting service here
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService(error, errorInfo) {
    // Implement error logging to your service
    // Example: Sentry, LogRocket, etc.
    try {
      // Send error to service
      console.error('[Error Reporting]', {
        error: error,
        errorInfo: errorInfo,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      });
    } catch (e) {
      // Fail silently in production, log in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to log error:', e);
      }
    }
  }

  handleRetry = () => {
    // Clear the error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: null
    });

    // If retry callback is provided, call it
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleNavigateHome = () => {
    window.location.href = '/';
  };

  renderErrorMessage() {
    const { errorType, error } = this.state;

    switch (errorType) {
      case 'network':
        return {
          title: 'Network Error',
          message: 'Unable to connect to the server. Please check your internet connection and try again.',
          icon: (
            <svg className="w-12 h-12 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          )
        };
      case 'type':
        return {
          title: 'Application Error',
          message: 'Something went wrong with the application. Our team has been notified.',
          icon: (
            <svg className="w-12 h-12 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        };
      default:
        return {
          title: 'Unexpected Error',
          message: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
          icon: (
            <svg className="w-12 h-12 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )
        };
    }
  }

  render() {
    if (this.state.hasError) {
      const errorContent = this.renderErrorMessage();
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8" data-testid="error-boundary">
          <div className="max-w-md w-full space-y-8">
            <div className="flex flex-col items-center">
              {errorContent.icon}
              <h2 className="text-center text-2xl font-bold text-gray-900 mb-2">
                {errorContent.title}
              </h2>
              <p className="text-center text-gray-600 mb-8">
                {errorContent.message}
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <Button
                onClick={this.handleRetry}
                className="w-full"
                data-testid="retry-button"
              >
                Try Again
              </Button>
              <Button
                onClick={this.handleReload}
                variant="secondary"
                className="w-full"
                data-testid="reload-button"
              >
                Reload Page
              </Button>
              <Button
                onClick={this.handleNavigateHome}
                variant="secondary"
                className="w-full"
                data-testid="home-button"
              >
                Go to Home
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-8 bg-gray-50 p-4 rounded-lg border" data-testid="error-details">
                <summary className="cursor-pointer text-sm text-red-600 font-medium">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-4 rounded overflow-auto">
                  {this.state.error.toString()}
                  {'\n\nComponent Stack:\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
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
