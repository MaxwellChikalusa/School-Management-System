import React, { useEffect, useRef, useState } from "react";
import { handleQuickExport } from "../utils/exportUtils";

export default function ExportMenu({ title, filename, rows, layout = "dropdown" }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (layout === "inline") {
      return undefined;
    }

    function handleClickOutside(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [layout]);

  function handleExport(mode) {
    handleQuickExport(title, filename, rows, mode);
    setOpen(false);
  }

  return (
    <div className={`export-menu export-menu-${layout}`} ref={rootRef}>
      <button type="button" className="export-trigger-button" onClick={() => setOpen((current) => !current)}>
        Export
      </button>
      {open ? (
        <div className="export-menu-panel">
          <button type="button" className="export-option-button export-option-excel" onClick={() => handleExport("excel")}>Export Excel</button>
          <button type="button" className="export-option-button export-option-pdf" onClick={() => handleExport("pdf")}>Export PDF</button>
          <button type="button" className="export-option-button export-option-print" onClick={() => handleExport("print")}>Print</button>
        </div>
      ) : null}
    </div>
  );
}
