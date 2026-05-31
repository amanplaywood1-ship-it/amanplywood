import { parse } from "csv-parse/sync";
import { makeSearchKey, parseIntSafe } from "@/lib/inventory";

export type ImportRow = {
  name: string;
  series: string;
  opening: number;
  outward: number;
  closing: number;
  rackNo?: string;
  serialNo?: number | null;
  spec?: string;
  tag?: string;
};

function normalizeHeaderKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

/** Map various CSV header spellings to canonical keys */
function canonicalKey(h: string): string | null {
  const n = normalizeHeaderKey(h);
  const map: Record<string, string> = {
    name: "name",
    category: "name",
    title: "name",
    product: "name",
    series: "series",
    code: "code",
    opening: "opening",
    outward: "outward",
    current: "outward",
    sold: "outward",
    closing: "closing",
    qty: "closing",
    quantity: "closing",
    stock: "closing",
    remaining: "closing",
    rack: "rackNo",
    rack_no: "rackNo",
    rackno: "rackNo",
    location: "rackNo",
    s_no: "serialNo",
    sno: "serialNo",
    serial: "serialNo",
    serial_no: "serialNo",
    search: "spec",
    spec: "spec",
    thickness: "spec",
    tag: "tag",
  };
  return map[n] ?? null;
}

function normalizeRecord(raw: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const canon = canonicalKey(k);
    if (canon) {
      out[canon] = String(v ?? "").trim();
    }
  }
  return out;
}

/** Legacy sheets may still have a separate code column — fold into series once. */
export function resolveSeries(r: Record<string, string>): string {
  const series = String(r.series ?? "").trim();
  const legacyCode = String(r.code ?? "").trim();
  if (!legacyCode) return series;
  if (!series) return legacyCode;
  const combined = `${legacyCode}${series}`;
  if (makeSearchKey(series) === makeSearchKey(combined)) return series;
  if (makeSearchKey(combined).endsWith(makeSearchKey(series))) return combined;
  return series || combined;
}

export function parseInventoryCsv(text: string): ImportRow[] {
  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Record<string, string>[];

  const rows: ImportRow[] = [];
  for (const raw of records) {
    const r = normalizeRecord(raw);
    const series = resolveSeries(r);
    if (!r.name || !series) continue;

    const opening = parseIntSafe(r.opening, 0);
    const outward = parseIntSafe(r.outward, 0);
    const closing =
      r.closing !== undefined && r.closing !== ""
        ? parseIntSafe(r.closing, 0)
        : Math.max(0, opening - outward);

    rows.push({
      name: r.name,
      series,
      opening,
      outward,
      closing,
      rackNo: r.rackNo || undefined,
      serialNo:
        r.serialNo !== undefined && r.serialNo !== ""
          ? parseIntSafe(r.serialNo, 0) || null
          : null,
      spec: r.spec || undefined,
      tag: r.tag || undefined,
    });
  }
  return rows;
}

export function rowsToInventoryData(rows: ImportRow[]) {
  const byKey = new Map<string, ImportRow>();
  for (const row of rows) {
    const searchKey = makeSearchKey(row.series);
    byKey.set(searchKey, { ...row, serialNo: row.serialNo ?? null });
  }

  return [...byKey.values()].map((row) => ({
    name: row.name,
    series: row.series.trim(),
    searchKey: makeSearchKey(row.series),
    opening: row.opening,
    added: row.opening,
    outward: row.outward,
    closing: row.closing,
    rackNo: row.rackNo ?? null,
    serialNo: row.serialNo ?? null,
    spec: row.spec?.trim() || null,
    tag: row.tag?.trim() || null,
  }));
}
