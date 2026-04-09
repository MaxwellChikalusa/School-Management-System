function downloadBlob(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportAsExcel(filename, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => `"${String(row[header] ?? "").replaceAll('"', '""')}"`)
        .join(",")
    ),
  ].join("\n");
  downloadBlob(`${filename}.csv`, csv, "text/csv;charset=utf-8;");
}

export function exportAsWord(filename, title, rows) {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const tableRows = rows
    .map(
      (row) =>
        `<tr>${headers.map((header) => `<td>${row[header] ?? ""}</td>`).join("")}</tr>`
    )
    .join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body><h1>${title}</h1><table border="1" cellspacing="0" cellpadding="6"><thead><tr>${headers
    .map((header) => `<th>${header}</th>`)
    .join("")}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
  downloadBlob(`${filename}.doc`, html, "application/msword");
}

export function exportAsPdf(title, rows) {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const html = `<!DOCTYPE html><html><head><title>${title}</title><style>body{font-family:Arial,sans-serif;padding:24px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #444;padding:8px;text-align:left;}h1{margin-bottom:16px;}</style></head><body><h1>${title}</h1><p>Use your browser Save as PDF option to complete the export.</p><table><thead><tr>${headers
    .map((header) => `<th>${header}</th>`)
    .join("")}</tr></thead><tbody>${rows
    .map(
      (row) =>
        `<tr>${headers.map((header) => `<td>${row[header] ?? ""}</td>`).join("")}</tr>`
    )
    .join("")}</tbody></table><script>window.onload=()=>{window.print();}</script></body></html>`;
  const win = window.open("", "_blank", "width=1100,height=800");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
}

export function printRows(title, rows) {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const html = `<!DOCTYPE html><html><head><title>${title}</title><style>body{font-family:Arial,sans-serif;padding:24px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #444;padding:8px;text-align:left;}h1{margin-bottom:16px;}</style></head><body><h1>${title}</h1><table><thead><tr>${headers
    .map((header) => `<th>${header}</th>`)
    .join("")}</tr></thead><tbody>${rows
    .map(
      (row) =>
        `<tr>${headers.map((header) => `<td>${row[header] ?? ""}</td>`).join("")}</tr>`
    )
    .join("")}</tbody></table></body></html>`;
  const win = window.open("", "_blank", "width=1100,height=800");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

export function handleQuickExport(title, filename, rows, mode) {
  if (mode === "excel") {
    exportAsExcel(filename, rows);
    return;
  }
  if (mode === "word") {
    exportAsWord(filename, title, rows);
    return;
  }
  if (mode === "pdf") {
    exportAsPdf(title, rows);
    return;
  }
  printRows(title, rows);
}
