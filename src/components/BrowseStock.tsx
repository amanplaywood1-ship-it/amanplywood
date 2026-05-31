"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { StockItem } from "@/components/SearchStock";

export function BrowseStock() {
  const [tags, setTags] = useState<string[]>([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/browse/tags");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load tags");
        if (!cancelled) setTags(data.tags ?? []);
      } catch {
        if (!cancelled) setTags([]);
      } finally {
        if (!cancelled) setTagsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchItems = useCallback(async (opts: { tag?: string | null; q?: string }) => {
    setError(null);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (opts.tag) params.set("tag", opts.tag);
      if (opts.q?.trim()) params.set("q", opts.q.trim());
      const res = await fetch(`/api/browse?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setItems(data.items ?? []);
    } catch (e) {
      setItems([]);
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const selectTag = (tag: string) => {
    setActiveTag(tag);
    setQuery("");
    void fetchItems({ tag });
  };

  const searchBySpec = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setActiveTag(null);
    void fetchItems({ q });
  }, [query, fetchItems]);

  const clearTag = () => {
    setActiveTag(null);
    setItems([]);
    setError(null);
  };

  const deleteItem = async (item: StockItem) => {
    const label = item.searchKey || item.series;
    if (!window.confirm(`Delete ${label} from inventory? This cannot be undone.`)) {
      return;
    }

    setError(null);
    setDeletingId(item.id);
    try {
      const res = await fetch(`/api/inventory?id=${encodeURIComponent(item.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <section className="rounded-2xl border border-blue-100/90 bg-white p-5 shadow-[0_4px_24px_-10px_rgba(30,58,138,0.12)] ring-1 ring-blue-950/[0.03] sm:p-6">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-blue-950">Browse by tag</h2>
          <p className="text-xs text-blue-700/85">
            Tags come from the <strong className="font-medium">Tag</strong> column in your sheet (e.g. PVC). Tap a tag to
            list every item in that group.
          </p>
          {tagsLoading ? (
            <p className="text-sm text-blue-700/70">Loading tags…</p>
          ) : tags.length === 0 ? (
            <p className="rounded-lg border border-dashed border-blue-200 bg-blue-50/50 px-3 py-2 text-sm text-blue-800/90">
              No tags yet. Re-import your Excel with <strong>Search</strong> and <strong>Tag</strong> columns.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const selected = activeTag === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => selectTag(tag)}
                    className={
                      selected
                        ? "rounded-full bg-gradient-to-b from-sky-600 to-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue-900/20"
                        : "rounded-full border-2 border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-900 transition hover:border-sky-300 hover:bg-sky-50"
                    }
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          )}
          {activeTag && (
            <button
              type="button"
              onClick={clearTag}
              className="text-xs font-medium text-blue-700 underline-offset-2 hover:underline"
            >
              Clear tag filter
            </button>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-blue-100/90 bg-white p-5 shadow-[0_4px_24px_-10px_rgba(30,58,138,0.12)] ring-1 ring-blue-950/[0.03] sm:p-6">
        <div className="space-y-2">
          <label htmlFor="browse-q" className="flex items-baseline gap-2 text-sm font-semibold text-blue-950">
            <span
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sky-600 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm"
              aria-hidden
            >
              mm
            </span>
            Search by spec
          </label>
          <p className="text-xs text-blue-700/85">
            Matches the sheet <strong className="font-medium">Search</strong> column (e.g. 0.8MM, 1MM).
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <input
              id="browse-q"
              type="search"
              inputMode="text"
              autoComplete="off"
              placeholder="0.8MM"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void searchBySpec();
              }}
              className="min-w-[12rem] flex-1 rounded-xl border-2 border-blue-200 bg-white px-4 py-3 text-base text-blue-950 shadow-inner outline-none placeholder:text-blue-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
            />
            <button
              type="button"
              onClick={() => void searchBySpec()}
              disabled={loading || !query.trim()}
              className="shrink-0 rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-900/20 transition hover:from-blue-500 hover:to-blue-600 disabled:opacity-50"
            >
              {loading ? "…" : "Show list"}
            </button>
          </div>
        </div>
      </section>

      {error && (
        <p className="rounded-lg border-2 border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      )}

      {(activeTag || query.trim()) && !loading && items.length === 0 && !error && (
        <p className="text-center text-sm text-blue-700/70">
          {activeTag ? `No items with tag “${activeTag}”.` : "No matches for that spec."}
        </p>
      )}

      {items.length > 0 && (
        <p className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white px-3 py-1.5 text-sm font-medium text-blue-900 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm" aria-hidden />
          {activeTag ? (
            <>
              Tag <span className="font-semibold">{activeTag}</span> — {items.length} item
              {items.length === 1 ? "" : "s"}
            </>
          ) : (
            <>
              {items.length} match{items.length === 1 ? "" : "es"}
            </>
          )}
          {items.length >= 400 ? " (first 400)" : ""}
        </p>
      )}

      {items.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-blue-100/90 bg-white shadow-[0_4px_24px_-10px_rgba(30,58,138,0.12)] ring-1 ring-blue-950/[0.03]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-blue-100 bg-blue-50/80">
                  <th className="whitespace-nowrap px-3 py-3 text-xs font-semibold uppercase tracking-wide text-blue-800">
                    Series
                  </th>
                  <th className="min-w-[10rem] px-3 py-3 text-xs font-semibold uppercase tracking-wide text-blue-800">
                    Name
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-xs font-semibold uppercase tracking-wide text-blue-800">
                    Tag
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-xs font-semibold uppercase tracking-wide text-blue-800">
                    Spec
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-blue-800">
                    Opening
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-blue-800">
                    Added
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-blue-800">
                    Sold
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-red-700">
                    Left
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-xs font-semibold uppercase tracking-wide text-blue-800">
                    Rack
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-xs font-semibold uppercase tracking-wide text-blue-800">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-50">
                {items.map((item) => (
                  <tr key={item.id} className="transition hover:bg-sky-50/50">
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono font-semibold text-blue-950">
                      {item.series}
                    </td>
                    <td className="max-w-[14rem] px-3 py-2.5 text-blue-950">{item.name}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-blue-800">{item.tag ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-medium text-red-700">{item.spec ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-blue-950">
                      {item.opening}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-blue-950">
                      {item.added}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-blue-950">
                      {item.outward}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums text-red-600">
                      {item.closing}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-blue-700/80">{item.rackNo ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link
                          href={`/?q=${encodeURIComponent(item.searchKey)}`}
                          className="inline-flex rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 transition hover:bg-blue-100"
                        >
                          Add / sell
                        </Link>
                        <button
                          type="button"
                          disabled={deletingId === item.id}
                          onClick={() => void deleteItem(item)}
                          className="inline-flex rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          {deletingId === item.id ? "…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
