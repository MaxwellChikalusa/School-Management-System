import React, { createContext, useContext, useMemo, useState } from "react";

const ConfirmDialogContext = createContext(() => Promise.resolve(false));

export function ConfirmDialogProvider({ children }) {
  const [dialogState, setDialogState] = useState({
    open: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    cancelLabel: "Cancel",
    tone: "danger",
    resolve: null,
  });

  const confirm = useMemo(
    () => (options) =>
      new Promise((resolve) => {
        setDialogState({
          open: true,
          title: options.title,
          message: options.message,
          confirmLabel: options.confirmLabel || "Confirm",
          cancelLabel: options.cancelLabel || "Cancel",
          tone: options.tone || "danger",
          resolve,
        });
      }),
    []
  );

  const closeDialog = (result) => {
    dialogState.resolve?.(result);
    setDialogState((current) => ({ ...current, open: false, resolve: null }));
  };

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      {dialogState.open ? (
        <div className="confirm-overlay" role="presentation">
          <div className="confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
            <p className="eyebrow">Please Confirm</p>
            <h3 id="confirm-title">{dialogState.title}</h3>
            <p>{dialogState.message}</p>
            <div className="button-row">
              <button type="button" className={`danger-button${dialogState.tone === "danger" ? " confirm-primary" : ""}`} onClick={() => closeDialog(true)}>
                {dialogState.confirmLabel}
              </button>
              <button type="button" className="confirm-secondary" onClick={() => closeDialog(false)}>
                {dialogState.cancelLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog() {
  return useContext(ConfirmDialogContext);
}
