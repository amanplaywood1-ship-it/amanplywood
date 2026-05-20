import { searchItems } from "@/lib/db/inventory";
import { normalizeQuery } from "@/lib/inventory";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({ items: [] });
  }

  try {
    const items = await searchItems(normalizeQuery(q));
    return NextResponse.json({ items });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
