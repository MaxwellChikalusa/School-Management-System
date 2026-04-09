import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const ConfirmDialogContext = createContext(() => Promise.resolve(false));
const SuccessDialogContext = createContext(() => {});

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
  const [successState, setSuccessState] = useState({
    open: false,
    title: "",
    message: "",
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

  const showSuccess = useMemo(
    () => (options) => {
      setSuccessState({
        open: true,
        title: options.title || "Success",
        message: options.message || "Saved successfully",
      });
    },
    []
  );

  useEffect(() => {
    if (!successState.open) return undefined;
    const timer = window.setTimeout(() => {
      setSuccessState({ open: false, title: "", message: "" });
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [successState.open]);

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      <SuccessDialogContext.Provider value={showSuccess}>
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
        {successState.open ? (
          <div className="confirm-overlay" role="presentation">
            <div className="confirm-card success-card" role="alertdialog" aria-modal="true" aria-labelledby="success-title">
              <p className="eyebrow">Success</p>
              <h3 id="success-title">{successState.title}</h3>
              <p>{successState.message}</p>
            </div>
          </div>
        ) : null}
      </SuccessDialogContext.Provider>
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog() {
  return useContext(ConfirmDialogContext);
}

export function useSuccessDialog() {
  return useContext(SuccessDialogContext);
}
