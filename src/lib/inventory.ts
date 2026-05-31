/** Normalized lookup key from series only, e.g. "2257FW", "72*24" */
export function makeSearchKey(series: string): string {
  return series.replace(/\s+/g, "").toUpperCase();
}

export function normalizeQuery(input: string): string {
  return input.replace(/\s+/g, "").toUpperCase();
}

export function parseIntSafe(value: string | undefined, fallback = 0): number {
  if (value == null || value === "") return fallback;
  const n = Number.parseInt(String(value).replace(/,/g, ""), 10);
  return Number.isFinite(n) ? n : fallback;
}
