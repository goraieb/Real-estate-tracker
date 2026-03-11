/** Price/m² → color gradient: blue (low) → yellow (mid) → red (high) */
export function priceToColor(precoM2: number): string {
  if (precoM2 <= 5000) return '#3b82f6';
  if (precoM2 <= 8000) return '#06b6d4';
  if (precoM2 <= 11000) return '#22c55e';
  if (precoM2 <= 14000) return '#eab308';
  if (precoM2 <= 18000) return '#f97316';
  return '#ef4444';
}

/** Yield % → color: red (low) → yellow → green (high) */
export function yieldToColor(yieldPct: number): string {
  if (yieldPct <= 4.0) return '#ef4444';
  if (yieldPct <= 5.0) return '#f97316';
  if (yieldPct <= 5.5) return '#eab308';
  if (yieldPct <= 6.0) return '#84cc16';
  if (yieldPct <= 7.0) return '#22c55e';
  return '#16a34a';
}
