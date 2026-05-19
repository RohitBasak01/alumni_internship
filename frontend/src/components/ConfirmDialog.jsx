import { createContext, useCallback, useContext, useMemo, useState } from "react";
import "./ConfirmDialog.css";

const ConfirmDialogContext = createContext(null);

const defaultDialog = {
  title: "Confirm action",
  message: "Are you sure you want to continue?",
  confirmLabel: "Confirm",
  cancelLabel: "Cancel",
  destructive: false
};

export function ConfirmDialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      setDialog({
        ...defaultDialog,
        ...options,
        resolve
      });
    });
  }, []);

  const closeDialog = useCallback(
    (answer) => {
      if (dialog?.resolve) {
        dialog.resolve(answer);
      }
      setDialog(null);
    },
    [dialog]
  );

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmDialogContext.Provider value={value}>
      {children}
      {dialog ? (
        <div className="confirm-dialog" role="presentation">
          <div aria-modal="true" className="confirm-dialog__panel" role="dialog">
            <div className={`confirm-dialog__icon ${dialog.destructive ? "confirm-dialog__icon--danger" : ""}`}>
              <span className="material-symbols-outlined" aria-hidden="true">
                {dialog.destructive ? "warning" : "help"}
              </span>
            </div>
            <div className="confirm-dialog__content">
              <h2>{dialog.title}</h2>
              <p>{dialog.message}</p>
            </div>
            <div className="confirm-dialog__actions">
              <button className="confirm-dialog__cancel" onClick={() => closeDialog(false)} type="button">
                {dialog.cancelLabel}
              </button>
              <button
                className={`confirm-dialog__confirm ${dialog.destructive ? "confirm-dialog__confirm--danger" : ""}`}
                onClick={() => closeDialog(true)}
                type="button"
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error("useConfirm must be used inside ConfirmDialogProvider");
  }
  return context.confirm;
}
