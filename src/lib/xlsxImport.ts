import * as XLSX from "xlsx";
import { resolveSeries, type ImportRow } from "./csvImport";
import { parseIntSafe } from "./inventory";

function norm(s: string): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/\./g, "");
}

type BlockCols = {
  serial: number;
  /** -1 when the sheet has no CODE column (series-only template) */
  code: number;
  series: number;
  opening: number;
  outward: number;
  closing: number;
  rack?: number;
  spec?: number;
  tag?: number;
};

function cellVal(sheet: XLSX.WorkSheet, r: number, c: number): unknown {
  const addr = XLSX.utils.encode_cell({ r, c });
  return sheet[addr]?.v;
}

function sheetToMatrix(sheet: XLSX.WorkSheet): string[][] {
  const ref = sheet["!ref"];
  if (!ref) return [];
  const range = XLSX.utils.decode_range(ref);
  const matrix: string[][] = [];
  for (let R = range.s.r; R <= range.e.r; R++) {
    const row: string[] = [];
    for (let C = range.s.c; C <= range.e.c; C++) {
      const v = cellVal(sheet, R, C);
      row.push(v === null || v === undefined ? "" : String(v).trim());
    }
    matrix.push(row);
  }

  const merges = sheet["!merges"];
  if (merges) {
    for (const m of merges) {
      const master = String(cellVal(sheet, m.s.r, m.s.c) ?? "").trim();
      if (!master) continue;
      for (let R = m.s.r; R <= m.e.r; R++) {
        for (let C = m.s.c; C <= m.e.c; C++) {
          const rr = R - range.s.r;
          const cc = C - range.s.c;
          if (matrix[rr] && (!matrix[rr][cc] || matrix[rr][cc] === "")) {
            matrix[rr][cc] = master;
          }
        }
      }
    }
  }

  return matrix;
}

function rowHasSeriesHeaders(row: string[]): boolean {
  for (const cell of row) {
    if (norm(cell) === "series") return true;
  }
  return false;
}

function isSerialHeader(top: string, sub: string): boolean {
  const t = norm(`${top} ${sub}`);
  if (t.includes("serial")) return true;
  if (t === "sno" || t === "slno") return true;
  if (top.trim().toUpperCase() === "S.NO" || top.trim().toUpperCase() === "S.NO.") return true;
  return false;
}

function classifyColumn(top: string, sub: string): "opening" | "outward" | "closing" | "rack" | null {
  const t = norm(top);
  const u = norm(sub);
  if (t.includes("rack") || u.includes("rack")) return "rack";
  if (t.includes("opening") || u.match(/^\d{1,2}[\/\-]\d{1,2}/) || t.match(/^\d{1,2}[\/\-]\d{1,2}/))
    return "opening";
  if (t === "outward" || t === "current" || u === "outward" || u === "current") return "outward";
  if (t === "closing" || t === "remaining" || u === "closing" || u === "remaining") return "closing";
  return null;
}

function identifyBlocksFromHeaderRow(row: string[], subRow?: string[]): BlockCols[] {
  const blocks: BlockCols[] = [];
  const width = row.length;

  for (let j = 0; j < width; j++) {
    if (norm(row[j]) !== "series") continue;

    let codeCol = -1;
    if (j > 0 && norm(row[j - 1]) === "code") {
      codeCol = j - 1;
    }

    let serialCol = (codeCol >= 0 ? codeCol : j) - 1;
    if (serialCol < 0 || !isSerialHeader(row[serialCol] ?? "", subRow?.[serialCol] ?? "")) {
      serialCol = -1;
    }

    let openingCol = -1;
    let outwardCol = -1;
    let closingCol = -1;
    let rackCol: number | undefined;
    let specCol: number | undefined;
    let tagCol: number | undefined;

    const maxScan = Math.min(j + 18, width);
    for (let c = j + 1; c < maxScan; c++) {
      const top = row[c] ?? "";
      const sub = subRow?.[c] ?? "";
      const tn = norm(top);
      const sn = norm(sub);
      if ((tn === "search" || sn === "search") && specCol === undefined) {
        specCol = c;
        continue;
      }
      if ((tn === "tag" || sn === "tag") && tagCol === undefined) {
        tagCol = c;
        continue;
      }
      const kind = classifyColumn(top, sub);
      if (kind === "opening" && openingCol < 0) openingCol = c;
      else if (kind === "outward" && outwardCol < 0) outwardCol = c;
      else if (kind === "closing" && closingCol < 0) closingCol = c;
      else if (kind === "rack" && rackCol === undefined) rackCol = c;
    }

    if (openingCol < 0) openingCol = j + 1;
    if (outwardCol < 0) outwardCol = openingCol + 1;
    if (closingCol < 0) closingCol = outwardCol + 1;

    blocks.push({
      serial: serialCol,
      code: codeCol,
      series: j,
      opening: openingCol,
      outward: outwardCol,
      closing: closingCol,
      rack: rackCol,
      spec: specCol,
      tag: tagCol,
    });

    j = Math.max(j, closingCol, specCol ?? -1, tagCol ?? -1);
  }

  return blocks;
}

function guessSectionTitle(row: string[]): string | null {
  if (rowHasSeriesHeaders(row)) return null;

  const cells = row.filter((c) => String(c).trim() !== "");
  if (cells.length === 0) return null;

  const joined = cells.join(" ");
  if (/\b\d{3,}\b/.test(joined)) return null;

  const first = String(cells[0]).trim();
  if (first.length < 3) return null;
  if (/^\d+$/.test(first)) return null;
  if (!/[A-Za-z]/.test(first)) return null;

  if (cells.length <= 4 && first.length >= 3) return first;
  if (first.length >= 8) return first;
  return null;
}

function isHeaderCell(value: string): boolean {
  const n = norm(value);
  return n === "code" || n === "series" || n === "sno" || n === "search" || n === "tag";
}

function extractBlocksFromDataRow(
  row: string[],
  blocks: BlockCols[],
  sectionName: string,
  lastLegacyCodeByBlock: (string | null)[],
): ImportRow[] {
  const name = sectionName.trim() || "Stock";
  const out: ImportRow[] = [];

  for (let bi = 0; bi < blocks.length; bi++) {
    const b = blocks[bi];

    let legacyCode = "";
    if (b.code >= 0) {
      legacyCode = String(row[b.code] ?? "").trim();
      if (!legacyCode && lastLegacyCodeByBlock[bi]) {
        legacyCode = lastLegacyCodeByBlock[bi]!;
      } else if (legacyCode) {
        lastLegacyCodeByBlock[bi] = legacyCode;
      }
    }

    const rawSeries = String(row[b.series] ?? "").trim();
    const series = resolveSeries({ series: rawSeries, code: legacyCode });
    if (!series) continue;
    if (isHeaderCell(rawSeries) || (legacyCode && isHeaderCell(legacyCode))) continue;

    const opening = parseIntSafe(row[b.opening], 0);
    const outward = parseIntSafe(row[b.outward], 0);
    let closing = parseIntSafe(row[b.closing], NaN);
    if (!Number.isFinite(closing)) {
      closing = Math.max(0, opening - outward);
    }

    const serialNo = b.serial >= 0 ? parseIntSafe(row[b.serial], NaN) : NaN;

    const rackNo =
      b.rack !== undefined ? String(row[b.rack] ?? "").trim() || undefined : undefined;
    const spec =
      b.spec !== undefined ? String(row[b.spec] ?? "").trim() || undefined : undefined;
    const tag =
      b.tag !== undefined ? String(row[b.tag] ?? "").trim() || undefined : undefined;

    out.push({
      name,
      series,
      opening,
      outward,
      closing,
      rackNo,
      serialNo: Number.isFinite(serialNo) ? serialNo : null,
      spec,
      tag,
    });
  }

  return out;
}

function rowLooksLikeInventoryData(row: string[], headerRow: string[]): boolean {
  let seriesCol = -1;
  for (let j = 0; j < headerRow.length; j++) {
    if (norm(headerRow[j]) === "series") {
      seriesCol = j;
      break;
    }
  }
  if (seriesCol < 0) return false;
  const series = String(row[seriesCol] ?? "").trim();
  return series.length > 0;
}

function parseMatrix(matrix: string[][]): ImportRow[] {
  let sectionName = "";
  let blocks: BlockCols[] | null = null;
  let lastLegacyCodeByBlock: (string | null)[] = [];
  const rows: ImportRow[] = [];

  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r] ?? [];
    if (!row.some((c) => String(c).trim() !== "")) continue;

    if (rowHasSeriesHeaders(row)) {
      const next = matrix[r + 1] ?? [];
      const nextIsHeader = rowHasSeriesHeaders(next);
      const nextIsData = rowLooksLikeInventoryData(next, row);
      const useSub =
        !nextIsHeader && !nextIsData && next.some((c) => String(c).trim() !== "")
          ? next
          : undefined;

      blocks = identifyBlocksFromHeaderRow(row, useSub);
      lastLegacyCodeByBlock = blocks.map(() => null);
      if (useSub) r++;
      continue;
    }

    if (blocks && blocks.length > 0) {
      const extracted = extractBlocksFromDataRow(row, blocks, sectionName, lastLegacyCodeByBlock);
      if (extracted.length > 0) {
        rows.push(...extracted);
        continue;
      }
    }

    const title = guessSectionTitle(row);
    if (title) {
      sectionName = title;
    }
  }

  return rows;
}

/**
 * Reads .xlsx workbooks in the Aman Ply Wood stock template:
 *
 *   Row 1–2: Section title — do not delete
 *   Row 3:   S.NO | Series | OPENING | OUTWARD | CLOSING | Search | Tag
 *   Row 4+:  User data — one row per item
 *
 * Series holds the full lookup id (e.g. 2257FW, 72*24). Legacy sheets with a
 * separate CODE column are still supported — code is folded into series on import.
 */
export function parseInventoryXlsx(buffer: ArrayBuffer): ImportRow[] {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const rows: ImportRow[] = [];

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const matrix = sheetToMatrix(sheet);
    if (matrix.length === 0) continue;
    rows.push(...parseMatrix(matrix));
  }

  return rows;
}
