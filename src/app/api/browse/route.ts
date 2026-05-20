import { browseItems } from "@/lib/db/inventory";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const tag = request.nextUrl.searchParams.get("tag")?.trim() ?? "";
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!tag && !q) {
    return NextResponse.json({ items: [] });
  }

  try {
    const items = await browseItems({ tag: tag || undefined, q: q || undefined });
    return NextResponse.json({ items });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Browse failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
