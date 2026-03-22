/** IFRS-style display: negatives in parentheses. */
export function formatStatementEUR(value: number): string {
  const abs = Math.abs(value);
  const formatted = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(abs);
  if (value < 0) return `(${formatted})`;
  return formatted;
}
