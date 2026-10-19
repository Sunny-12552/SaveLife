import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo);
    }
    
    // TODO: Log to error reporting service (e.g., Sentry) in production
  }

  handleReset = () => {
    this.setState({ 
      hasError: false,
      error: null,
      errorInfo: null 
    });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.iconContainer}>
              <span style={styles.icon}>⚠️</span>
            </div>
            
            <h1 style={styles.title}>Oops! Something went wrong</h1>
            
            <p style={styles.message}>
              We're sorry, but something unexpected happened. 
              This error has been logged and we'll look into it.
            </p>

            <div style={styles.buttonContainer}>
              <button 
                onClick={this.handleReset}
                style={styles.button}
              >
                Go to Dashboard
              </button>
              
              <button 
                onClick={() => window.location.reload()}
                style={styles.buttonSecondary}
              >
                Reload Page
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={styles.details}>
                <summary style={styles.summary}>Error Details (Development Only)</summary>
                <pre style={styles.errorText}>
                  <strong>Error:</strong> {this.state.error.toString()}
                  {'\n\n'}
                  <strong>Stack Trace:</strong>
                  {'\n'}
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

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    padding: '20px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '40px',
    maxWidth: '600px',
    width: '100%',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    textAlign: 'center',
  },
  iconContainer: {
    marginBottom: '20px',
  },
  icon: {
    fontSize: '64px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '16px',
  },
  message: {
    fontSize: '16px',
    color: '#666',
    lineHeight: '1.6',
    marginBottom: '32px',
  },
  buttonContainer: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  button: {
    backgroundColor: '#DC143C',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  buttonSecondary: {
    backgroundColor: '#f0f0f0',
    color: '#333',
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  details: {
    marginTop: '32px',
    textAlign: 'left',
    backgroundColor: '#f9f9f9',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #ddd',
  },
  summary: {
    cursor: 'pointer',
    fontWeight: 'bold',
    marginBottom: '12px',
    color: '#DC143C',
  },
  errorText: {
    fontSize: '12px',
    color: '#666',
    overflow: 'auto',
    maxHeight: '300px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
};

export default ErrorBoundary;
