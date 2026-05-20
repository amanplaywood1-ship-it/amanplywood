/** Normalized key for lookup: e.g. "2257" + "FW" -> "2257FW" */
export function makeSearchKey(code: string, series: string): string {
  const c = code.replace(/\s+/g, "").trim();
  const s = series.replace(/\s+/g, "").trim();
  return `${c}${s}`.toUpperCase();
}

export function normalizeQuery(input: string): string {
  return input.replace(/\s+/g, "").toUpperCase();
}

export function parseIntSafe(value: string | undefined, fallback = 0): number {
  if (value == null || value === "") return fallback;
  const n = Number.parseInt(String(value).replace(/,/g, ""), 10);
  return Number.isFinite(n) ? n : fallback;
}
