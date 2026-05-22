const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Philippine peso display, e.g. ₱1,234.56 */
export function formatPeso(amount: number): string {
  return pesoFormatter.format(amount);
}
