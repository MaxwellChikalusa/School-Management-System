export function formatNumber(value) {
  const numericValue = Number(value ?? 0);
  if (!Number.isFinite(numericValue)) return String(value ?? "");
  return new Intl.NumberFormat("en-MW").format(numericValue);
}

export function formatCurrency(value) {
  return formatNumber(value);
}
