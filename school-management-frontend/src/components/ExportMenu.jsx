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
      <button type="button" onClick={() => setOpen((current) => !current)}>
        Export
      </button>
      {open ? (
        <div className="export-menu-panel">
          <button type="button" onClick={() => handleQuickExport(title, filename, rows, "excel")}>Export Excel</button>
          <button type="button" onClick={() => handleQuickExport(title, filename, rows, "word")}>Export Word</button>
          <button type="button" onClick={() => handleQuickExport(title, filename, rows, "print")}>Print</button>
        </div>
      ) : null}
    </div>
  );
}
