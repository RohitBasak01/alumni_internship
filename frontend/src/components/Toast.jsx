import { createContext, useCallback, useContext, useMemo, useState } from "react";
import "./Toast.css";

const ToastContext = createContext(null);

const VARIANT_ICONS = {
  success: "check_circle",
  error: "error",
  info: "info",
  warning: "warning"
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, message, variant = "info", duration = 4200 }) => {
      const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      const toast = {
        id,
        title,
        message,
        variant
      };

      setToasts((current) => [toast, ...current].slice(0, 5));

      if (duration > 0) {
        window.setTimeout(() => dismissToast(id), duration);
      }

      return id;
    },
    [dismissToast]
  );

  const value = useMemo(
    () => ({
      showToast,
      success: (message, options = {}) => showToast({ ...options, message, variant: "success" }),
      error: (message, options = {}) => showToast({ ...options, message, variant: "error" }),
      info: (message, options = {}) => showToast({ ...options, message, variant: "info" }),
      warning: (message, options = {}) => showToast({ ...options, message, variant: "warning" })
    }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="toast-stack">
        {toasts.map((toast) => (
          <article className={`toast toast--${toast.variant}`} key={toast.id} role="status">
            <span className="material-symbols-outlined toast__icon" aria-hidden="true">
              {VARIANT_ICONS[toast.variant] || VARIANT_ICONS.info}
            </span>
            <div className="toast__body">
              {toast.title ? <strong>{toast.title}</strong> : null}
              <p>{toast.message}</p>
            </div>
            <button
              aria-label="Dismiss notification"
              className="toast__close"
              onClick={() => dismissToast(toast.id)}
              type="button"
            >
              <span className="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
          </article>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return context;
}
