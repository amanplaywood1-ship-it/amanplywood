import { createServerSupabase } from "@/lib/supabase/server";
import type {
  InventoryItem,
  InventoryItemInsert,
  InventoryItemRow,
} from "@/lib/types/inventory";

const TABLE = "inventory_item";

export function rowToItem(row: InventoryItemRow): InventoryItem {
  return {
    id: row.id,
    name: row.name,
    serialNo: row.serial_no,
    code: row.code,
    series: row.series,
    searchKey: row.search_key,
    opening: row.opening,
    added: row.added,
    outward: row.outward,
    closing: row.closing,
    rackNo: row.rack_no,
    spec: row.spec,
    tag: row.tag,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function insertToRow(data: InventoryItemInsert): Omit<InventoryItemRow, "id" | "created_at" | "updated_at"> {
  return {
    name: data.name,
    serial_no: data.serialNo ?? null,
    code: data.code,
    series: data.series,
    search_key: data.searchKey,
    opening: data.opening,
    added: data.added,
    outward: data.outward,
    closing: data.closing,
    rack_no: data.rackNo ?? null,
    spec: data.spec ?? null,
    tag: data.tag ?? null,
  };
}

function dbError(context: string, error: { message: string }): never {
  throw new Error(`${context}: ${error.message}`);
}

/** Escape % and _ for PostgREST ilike filters */
export function ilikePattern(input: string): string {
  return `%${input.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
}

export async function countInventory(): Promise<number> {
  const supabase = createServerSupabase();
  const { count, error } = await supabase
    .from(TABLE)
    .select("*", { count: "exact", head: true });
  if (error) dbError("countInventory", error);
  return count ?? 0;
}

export async function getDistinctTags(): Promise<string[]> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("tag")
    .not("tag", "is", null)
    .order("tag", { ascending: true });
  if (error) dbError("getDistinctTags", error);

  const seen = new Set<string>();
  const tags: string[] = [];
  for (const row of data ?? []) {
    const t = String(row.tag ?? "").trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    tags.push(t);
  }
  return tags;
}

export async function browseItems(opts: {
  tag?: string;
  q?: string;
}): Promise<InventoryItem[]> {
  const supabase = createServerSupabase();
  let query = supabase.from(TABLE).select("*").order("search_key", { ascending: true }).limit(400);

  if (opts.tag) {
    query = query.ilike("tag", opts.tag);
  }
  if (opts.q) {
    query = query.ilike("spec", ilikePattern(opts.q));
  }

  const { data, error } = await query;
  if (error) dbError("browseItems", error);
  return (data as InventoryItemRow[]).map(rowToItem);
}

export async function searchItems(q: string): Promise<InventoryItem[]> {
  const supabase = createServerSupabase();
  const key = q.replace(/\s+/g, "").toUpperCase();

  const { data: exact, error: exactErr } = await supabase
    .from(TABLE)
    .select("*")
    .eq("search_key", key)
    .maybeSingle();
  if (exactErr) dbError("searchItems exact", exactErr);
  if (exact) return [rowToItem(exact as InventoryItemRow)];

  const { data: prefix, error: prefixErr } = await supabase
    .from(TABLE)
    .select("*")
    .ilike("search_key", `${key}%`)
    .order("search_key", { ascending: true })
    .limit(25);
  if (prefixErr) dbError("searchItems prefix", prefixErr);
  if (prefix && prefix.length > 0) {
    return (prefix as InventoryItemRow[]).map(rowToItem);
  }

  const { data: contains, error: containsErr } = await supabase
    .from(TABLE)
    .select("*")
    .ilike("search_key", `%${key}%`)
    .order("search_key", { ascending: true })
    .limit(25);
  if (containsErr) dbError("searchItems contains", containsErr);
  return (contains as InventoryItemRow[]).map(rowToItem);
}

export async function adjustStock(
  searchKey: string,
  amount: number,
  action: "add" | "sell",
): Promise<InventoryItem> {
  const supabase = createServerSupabase();

  const { data: row, error: fetchErr } = await supabase
    .from(TABLE)
    .select("*")
    .eq("search_key", searchKey)
    .maybeSingle();
  if (fetchErr) dbError("adjustStock fetch", fetchErr);
  if (!row) throw new Error("NOT_FOUND");

  const current = row as InventoryItemRow;

  if (action === "sell") {
    if (current.closing < amount) throw new Error("INSUFFICIENT");
    const { data: updated, error: updateErr } = await supabase
      .from(TABLE)
      .update({
        closing: current.closing - amount,
        outward: current.outward + amount,
      })
      .eq("search_key", searchKey)
      .select("*")
      .single();
    if (updateErr) dbError("adjustStock sell", updateErr);
    return rowToItem(updated as InventoryItemRow);
  }

  const { data: updated, error: updateErr } = await supabase
    .from(TABLE)
    .update({
      closing: current.closing + amount,
      added: current.added + amount,
    })
    .eq("search_key", searchKey)
    .select("*")
    .single();
  if (updateErr) dbError("adjustStock add", updateErr);
  return rowToItem(updated as InventoryItemRow);
}

export async function deleteAllInventory(): Promise<void> {
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .not("search_key", "is", null);
  if (error) dbError("deleteAllInventory", error);
}

export async function importInventoryRows(
  rows: InventoryItemInsert[],
  mode: "replace" | "append",
): Promise<{ created: number; updated: number; total: number }> {
  if (mode === "replace") {
    await deleteAllInventory();
  }

  const supabase = createServerSupabase();
  let created = 0;
  let updated = 0;

  for (const data of rows) {
    const { data: existing, error: findErr } = await supabase
      .from(TABLE)
      .select("id")
      .eq("search_key", data.searchKey)
      .maybeSingle();
    if (findErr) dbError("importInventoryRows find", findErr);

    const payload = insertToRow(data);

    if (existing) {
      const { error: updateErr } = await supabase
        .from(TABLE)
        .update(payload)
        .eq("search_key", data.searchKey);
      if (updateErr) dbError("importInventoryRows update", updateErr);
      updated++;
    } else {
      const { error: insertErr } = await supabase.from(TABLE).insert(payload);
      if (insertErr) dbError("importInventoryRows insert", insertErr);
      created++;
    }
  }

  const total = await countInventory();
  return { created, updated, total };
}
