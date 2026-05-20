"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type StockItem = {
  id: string;
  name: string;
  code: string;
  series: string;
  searchKey: string;
  opening: number;
  added: number;
  outward: number;
  closing: number;
  rackNo: string | null;
  spec?: string | null;
  tag?: string | null;
};

function parseQuantity(draft: string): number {
  const digits = draft.replace(/\D/g, "");
  if (digits === "") return 1;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) ? Math.max(1, n) : 1;
}

export function SearchStock({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [items, setItems] = useState<StockItem[]>([]);
  const [selected, setSelected] = useState<StockItem | null>(null);
  const [amountDraft, setAmountDraft] = useState("1");
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const quantity = useMemo(() => parseQuantity(amountDraft), [amountDraft]);

  const search = useCallback(async (qOverride?: string) => {
    const q = (qOverride ?? query).trim();
    setError(null);
    setActionMsg(null);
    setLoading(true);
    setSelected(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      const list: StockItem[] = data.items ?? [];
      setItems(list);
      if (list.length === 1) {
        setSelected(list[0]);
      }
    } catch (e) {
      setItems([]);
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const q = initialQuery.trim();
    if (!q) return;
    void search(q);
    // Intentionally once on load when URL prefills ?q= (e.g. from Browse).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickItem = (item: StockItem) => {
    setSelected(item);
    setAmountDraft("1");
    setActionMsg(null);
    setError(null);
  };

  const bump = (delta: number) => {
    setAmountDraft(String(Math.max(1, parseQuantity(amountDraft) + delta)));
  };

  const normalizeAmountDraft = () => {
    setAmountDraft(String(parseQuantity(amountDraft)));
  };

  const refreshSelected = async (searchKey: string) => {
    const res = await fetch(`/api/search?q=${encodeURIComponent(searchKey)}`);
    const data = await res.json();
    const list: StockItem[] = data.items ?? [];
    const next = list.find((i) => i.searchKey === searchKey) ?? null;
    setSelected(next);
    setItems((prev) => prev.map((i) => (i.searchKey === searchKey && next ? next : i)));
  };

  const adjust = async (action: "add" | "sell") => {
    if (!selected) return;
    const qty = parseQuantity(amountDraft);
    setError(null);
    setActionMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          searchKey: selected.searchKey,
          amount: qty,
          action,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      setActionMsg(action === "add" ? `Added ${qty} to stock.` : `Sold ${qty}.`);
      setAmountDraft("1");
      if (data.item) {
        setSelected(data.item);
        setItems((prev) => prev.map((i) => (i.searchKey === data.item.searchKey ? data.item : i)));
      } else {
        await refreshSelected(selected.searchKey);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-full min-w-0 space-y-6 px-4 py-6 sm:max-w-lg sm:px-6 sm:py-8">
      <section className="rounded-2xl border border-blue-100/90 bg-white p-4 shadow-[0_4px_24px_-10px_rgba(30,58,138,0.12)] ring-1 ring-blue-950/[0.03] sm:p-6">
        <div className="space-y-2">
          <label htmlFor="q" className="flex flex-wrap items-baseline gap-2 text-sm font-semibold text-blue-950">
            <span
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-600 text-[11px] font-bold text-white shadow-sm"
              aria-hidden
            >
              #
            </span>
            Code + series
          </label>
          <p className="text-xs leading-relaxed text-blue-700/85">
            Example: 2257FW — code and series together, no space.
          </p>
          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-stretch sm:gap-2">
            <input
              id="q"
              type="search"
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="2257FW"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void search();
              }}
              className="min-h-12 min-w-0 w-full rounded-xl border-2 border-blue-200 bg-white px-4 py-3 text-base text-blue-950 shadow-inner outline-none placeholder:text-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
            <button
              type="button"
              onClick={() => void search()}
              disabled={loading || !query.trim()}
              className="min-h-12 w-full shrink-0 rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-900/20 transition hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 sm:w-auto sm:min-w-[7.5rem]"
            >
              {loading ? "…" : "Search"}
            </button>
          </div>
        </div>
      </section>

      {error && (
        <p className="rounded-lg border-2 border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      )}

      {items.length > 1 && !selected && (
        <div className="space-y-3">
          <p className="text-sm text-blue-800/80">Multiple matches — pick one:</p>
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => pickItem(item)}
                  className="flex w-full min-w-0 flex-col gap-1 rounded-xl border border-blue-100/90 bg-white px-4 py-3 text-left text-sm shadow-sm ring-1 ring-blue-950/[0.03] transition hover:bg-blue-50 hover:border-blue-200 active:bg-blue-50"
                >
                  <span className="break-all font-semibold text-blue-950">{item.searchKey}</span>
                  <span className="break-words text-blue-800/80">{item.name}</span>
                  <span className="text-blue-800/90">
                    Added {item.added} · Sold {item.outward} · Left {item.closing}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {items.length === 0 && query && !loading && !error && (
        <p className="text-center text-sm text-blue-700/70">No rows found. Import data first.</p>
      )}

      {selected && (
        <article className="space-y-5 rounded-2xl border border-blue-100/90 bg-white p-4 shadow-[0_8px_32px_-12px_rgba(30,58,138,0.15)] ring-1 ring-blue-950/[0.04] sm:p-6">
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-snug text-blue-950 break-words sm:text-lg">{selected.name}</h2>
            <p className="mt-1 flex flex-wrap gap-x-1 gap-y-0.5 text-sm text-blue-800/90">
              <span>
                Code <span className="font-mono font-semibold text-blue-950 break-all">{selected.code}</span>
              </span>
              <span className="text-blue-400" aria-hidden>
                ·
              </span>
              <span>
                Series <span className="font-mono font-semibold text-blue-950 break-all">{selected.series}</span>
              </span>
            </p>
            {selected.rackNo && <p className="mt-1 text-sm text-blue-700/80">Rack: {selected.rackNo}</p>}
          </div>

          <dl className="grid grid-cols-2 gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-sm">
            <div>
              <dt className="text-xs font-medium text-blue-700/85">Opening</dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-blue-950">{selected.opening}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-blue-700/85">Added</dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-blue-950">{selected.added}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-blue-700/85">Sold (total)</dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-blue-950">{selected.outward}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-blue-800">Left now</dt>
              <dd className="mt-0.5 text-2xl font-semibold tabular-nums text-red-600">{selected.closing}</dd>
            </div>
          </dl>

          <div>
            <p className="mb-2 text-center text-xs font-medium text-blue-800/80">Quantity (tap to type or use ±)</p>
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              <button
                type="button"
                aria-label="Decrease amount"
                onClick={() => bump(-1)}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-blue-300 bg-white text-xl font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 active:scale-95"
              >
                −
              </button>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                aria-label="Quantity"
                value={amountDraft}
                onChange={(e) => setAmountDraft(e.target.value)}
                onBlur={normalizeAmountDraft}
                className="min-w-[4.5rem] max-w-[8rem] rounded-xl border-2 border-blue-200 bg-white px-2 py-2.5 text-center text-2xl font-semibold tabular-nums text-blue-950 shadow-inner outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
              <button
                type="button"
                aria-label="Increase amount"
                onClick={() => bump(1)}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-blue-300 bg-white text-xl font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 active:scale-95"
              >
                +
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={() => void adjust("add")}
              className="rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50 active:scale-[0.98]"
            >
              Add stock
            </button>
            <button
              type="button"
              disabled={loading || selected.closing < quantity}
              onClick={() => void adjust("sell")}
              className="rounded-xl bg-red-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50 active:scale-[0.98]"
            >
              Sell
            </button>
          </div>

          {actionMsg && <p className="text-center text-sm font-medium text-blue-800">{actionMsg}</p>}

          {items.length > 1 && (
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setActionMsg(null);
              }}
              className="w-full text-sm text-blue-700 underline-offset-2 hover:underline"
            >
              Back to list
            </button>
          )}
        </article>
      )}
    </div>
  );
}
