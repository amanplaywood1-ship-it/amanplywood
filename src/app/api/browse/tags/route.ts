import { getDistinctTags } from "@/lib/db/inventory";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const tags = await getDistinctTags();
    return NextResponse.json({ tags });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not load tags";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
