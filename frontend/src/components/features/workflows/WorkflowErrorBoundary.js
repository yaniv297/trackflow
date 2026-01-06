import React from "react";

class WorkflowErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error for debugging
    console.error("Workflow Error Boundary caught an error:", error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div style={{
          padding: "2rem",
          backgroundColor: "#fef2f2",
          border: "1px solid #f87171",
          borderRadius: "8px",
          margin: "1rem 0"
        }}>
          <h3 style={{ color: "#dc2626", marginBottom: "1rem" }}>
            🔧 Workflow Error
          </h3>
          <p style={{ color: "#7f1d1d", marginBottom: "1rem" }}>
            There was an error loading the workflow data. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: "#dc2626",
              color: "white",
              border: "none",
              borderRadius: "6px",
              padding: "0.5rem 1rem",
              cursor: "pointer"
            }}
          >
            Refresh Page
          </button>
          
          {/* Development error details */}
          {process.env.NODE_ENV === 'development' && (
            <details style={{ marginTop: "1rem", fontSize: "0.9rem" }}>
              <summary style={{ cursor: "pointer", color: "#7f1d1d" }}>
                Error Details (Development)
              </summary>
              <pre style={{ 
                backgroundColor: "#fee2e2", 
                padding: "1rem", 
                borderRadius: "4px",
                overflow: "auto",
                marginTop: "0.5rem",
                fontSize: "0.8rem"
              }}>
                {this.state.error && this.state.error.toString()}
                {this.state.errorInfo?.componentStack && (
                  <>
                    <br />
                    {this.state.errorInfo.componentStack}
                  </>
                )}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default WorkflowErrorBoundary;