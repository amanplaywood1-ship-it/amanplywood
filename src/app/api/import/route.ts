import { importInventoryRows } from "@/lib/db/inventory";
import { parseInventoryCsv, rowsToInventoryData } from "@/lib/csvImport";
import { parseInventoryXlsx } from "@/lib/xlsxImport";
import { NextRequest, NextResponse } from "next/server";

function isXlsxFile(file: File): boolean {
  const n = file.name.toLowerCase();
  return n.endsWith(".xlsx") || n.endsWith(".xls") || file.type.includes("spreadsheet");
}

export async function POST(request: NextRequest) {
  try {
    return await handleImport(request);
  } catch (e) {
    console.error("[import]", e);
    const message = e instanceof Error ? e.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleImport(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  let mode: "replace" | "append" = "append";
  let rowsPayload: unknown;

  if (contentType.includes("application/json")) {
    const body = await request.json();
    mode = body.mode === "replace" ? "replace" : "append";
    if (typeof body.csvText === "string" && body.csvText.trim().length > 0) {
      rowsPayload = parseInventoryCsv(body.csvText);
    } else if (Array.isArray(body.rows)) {
      rowsPayload = body.rows;
    } else {
      return NextResponse.json(
        { error: "JSON body needs csvText (string) or rows (array)" },
        { status: 400 },
      );
    }
  } else if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    const m = form.get("mode");
    mode = m === "replace" ? "replace" : "append";
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file field" }, { status: 400 });
    }
    if (isXlsxFile(file)) {
      const buf = await file.arrayBuffer();
      rowsPayload = parseInventoryXlsx(buf);
    } else {
      const text = await file.text();
      rowsPayload = parseInventoryCsv(text);
    }
  } else {
    return NextResponse.json(
      { error: "Use multipart/form-data with file=, or application/json with rows=[]" },
      { status: 415 },
    );
  }

  let rows: ReturnType<typeof rowsToInventoryData>;
  if (Array.isArray(rowsPayload) && rowsPayload.length > 0 && typeof rowsPayload[0] === "object") {
    const normalized = (rowsPayload as Record<string, unknown>[]).map((r) => ({
      name: String(r.name ?? "").trim(),
      code: String(r.code ?? "").trim(),
      series: String(r.series ?? "").trim(),
      opening: Number(r.opening) || 0,
      outward: Number(r.outward) || 0,
      closing: Number(r.closing) || 0,
      rackNo: r.rackNo != null ? String(r.rackNo) : undefined,
      serialNo: r.serialNo != null ? Number(r.serialNo) : null,
      spec: r.spec != null ? String(r.spec) : undefined,
      tag: r.tag != null ? String(r.tag) : undefined,
    }));
    rows = rowsToInventoryData(normalized);
  } else if (Array.isArray(rowsPayload)) {
    rows = rowsToInventoryData(rowsPayload as Parameters<typeof rowsToInventoryData>[0]);
  } else {
    return NextResponse.json({ error: "rows must be a non-empty array" }, { status: 400 });
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "No valid rows to import" }, { status: 400 });
  }

  const result = await importInventoryRows(rows, mode);
  return NextResponse.json({ ...result, mode });
}
