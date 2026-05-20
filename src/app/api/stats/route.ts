import { countInventory } from "@/lib/db/inventory";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const total = await countInventory();
    return NextResponse.json({ total });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stats failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
