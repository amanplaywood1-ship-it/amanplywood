import { adjustStock } from "@/lib/db/inventory";
import { normalizeQuery } from "@/lib/inventory";
import { NextRequest, NextResponse } from "next/server";

type Action = "add" | "sell";

export async function POST(request: NextRequest) {
  let body: { searchKey?: string; amount?: number; action?: Action };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const searchKey = normalizeQuery(String(body.searchKey ?? ""));
  const amount = Number(body.amount);
  const action = body.action;

  if (!searchKey) {
    return NextResponse.json({ error: "searchKey is required" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount < 1 || !Number.isInteger(amount)) {
    return NextResponse.json(
      { error: "amount must be a positive whole number" },
      { status: 400 },
    );
  }
  if (action !== "add" && action !== "sell") {
    return NextResponse.json({ error: "action must be add or sell" }, { status: 400 });
  }

  try {
    const item = await adjustStock(searchKey, amount, action);
    return NextResponse.json({ item });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    if (msg === "INSUFFICIENT") {
      return NextResponse.json(
        { error: "Not enough stock for this sale" },
        { status: 409 },
      );
    }
    const message = msg || "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
