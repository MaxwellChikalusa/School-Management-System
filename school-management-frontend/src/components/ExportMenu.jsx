import React, { useEffect, useRef, useState } from "react";
import { handleQuickExport } from "../utils/exportUtils";

export default function ExportMenu({ title, filename, rows }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="export-menu" ref={rootRef}>
      <button type="button" className="export-trigger-button" onClick={() => setOpen((current) => !current)}>
        Export
      </button>
      {open ? (
        <div className="export-menu-panel">
          <button type="button" className="export-option-button export-option-excel" onClick={() => handleQuickExport(title, filename, rows, "excel")}>Export Excel</button>
          <button type="button" className="export-option-button export-option-pdf" onClick={() => handleQuickExport(title, filename, rows, "pdf")}>Export PDF</button>
          <button type="button" className="export-option-button export-option-print" onClick={() => handleQuickExport(title, filename, rows, "print")}>Print</button>
        </div>
      ) : null}
    </div>
  );
}
