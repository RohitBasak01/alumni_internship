import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: "2rem",
            background:
              "radial-gradient(circle at top left, rgba(37,84,216,0.06), transparent 40%), linear-gradient(135deg, #f8fbff 0%, #eef3ff 100%)",
            fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
          }}
        >
          <div
            style={{
              width: "min(520px, 100%)",
              display: "grid",
              gap: "1.5rem",
              padding: "2.5rem 2.5rem 2rem",
              borderRadius: "24px",
              border: "1px solid rgba(20,33,61,0.1)",
              background: "rgba(255,255,255,0.98)",
              boxShadow: "0 20px 48px rgba(20,33,61,0.1)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "4.5rem",
                height: "4.5rem",
                margin: "0 auto",
                display: "grid",
                placeItems: "center",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #fee2e2, #fecaca)",
                color: "#dc2626",
                fontSize: "1.75rem",
              }}
              aria-hidden="true"
            >
              !
            </div>

            <div>
              <p
                style={{
                  margin: "0 0 0.35rem",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  color: "#dc2626",
                }}
              >
                Something went wrong
              </p>
              <h1
                style={{
                  margin: 0,
                  fontSize: "clamp(1.5rem, 3vw, 2rem)",
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  color: "#121a31",
                }}
              >
                Unexpected Error
              </h1>
            </div>

            <p
              style={{
                margin: 0,
                color: "rgba(20,33,61,0.6)",
                lineHeight: 1.6,
              }}
            >
              An unexpected error occurred while rendering this page. You can
              try reloading, or go back to the home page.
            </p>

            {this.state.error?.message ? (
              <details
                style={{
                  textAlign: "left",
                  padding: "0.75rem 1rem",
                  borderRadius: "12px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  fontSize: "0.85rem",
                  color: "#991b1b",
                }}
              >
                <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                  Error details
                </summary>
                <pre
                  style={{
                    marginTop: "0.5rem",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontSize: "0.8rem",
                  }}
                >
                  {this.state.error.message}
                </pre>
              </details>
            ) : null}

            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "center",
                flexWrap: "wrap",
                marginTop: "0.5rem",
              }}
            >
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  padding: "0.8rem 1.5rem",
                  border: "none",
                  borderRadius: "14px",
                  background: "linear-gradient(135deg, #2554d8, #1d46bc)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  cursor: "pointer",
                  boxShadow: "0 8px 20px rgba(37,84,216,0.25)",
                }}
              >
                Reload Page
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                style={{
                  padding: "0.8rem 1.5rem",
                  border: "1px solid rgba(20,33,61,0.15)",
                  borderRadius: "14px",
                  background: "#fff",
                  color: "#14213d",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  cursor: "pointer",
                }}
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
