"use client";

import { useCallback, useState } from "react";

type Props = {
  initialTotal: number;
};

async function readApiJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error(res.ok ? "Empty server response" : `Request failed (${res.status})`);
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(res.ok ? "Invalid server response" : `Request failed (${res.status})`);
  }
}

export function ImportPanel({ initialTotal }: Props) {
  const [total, setTotal] = useState(initialTotal);
  const [mode, setMode] = useState<"append" | "replace">("append");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats");
      const data = await res.json();
      if (res.ok) setTotal(data.total ?? 0);
    } catch {
      /* keep last known total */
    }
  }, []);

  const upload = async () => {
    setError(null);
    setStatus(null);
    if (!file) {
      setError("Choose an Excel (.xlsx) or CSV file first.");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("mode", mode);
      const res = await fetch("/api/import", { method: "POST", body: fd });
      const data = await readApiJson(res);
      if (!res.ok) throw new Error(String(data.error ?? "Import failed"));
      setStatus(
        `Imported: ${data.created} new, ${data.updated} updated. Total rows: ${data.total}.`,
      );
      setFile(null);
      await loadStats();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  const loadSample = async () => {
    setError(null);
    setStatus(null);
    setBusy(true);
    try {
      const res = await fetch("/sample-stock.csv");
      const text = await res.text();
      const imp = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "append", csvText: text }),
      });
      const data = await readApiJson(imp);
      if (!imp.ok) throw new Error(String(data.error ?? "Sample import failed"));
      setStatus(
        `Sample loaded: ${data.created} new, ${data.updated} updated. Total: ${data.total}.`,
      );
      await loadStats();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sample import failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg space-y-6 bg-[#f0f7ff] px-4 py-8 sm:px-6">
      

      <div className="space-y-3 rounded-2xl border border-blue-100/90 bg-white p-5 shadow-[0_4px_24px_-10px_rgba(30,58,138,0.12)] ring-1 ring-blue-950/[0.03] sm:p-6">
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-blue-950">Import mode</legend>
          <label className="flex items-center gap-2 text-sm text-blue-800">
            <input
              type="radio"
              name="mode"
              checked={mode === "append"}
              onChange={() => setMode("append")}
            />
            Append / update by code+series (safe for adding new rows)
          </label>
          <label className="flex items-center gap-2 text-sm text-blue-800">
            <input
              type="radio"
              name="mode"
              checked={mode === "replace"}
              onChange={() => setMode("replace")}
            />
            Replace all (deletes existing data, then imports this file)
          </label>
        </fieldset>

        <label className="block text-sm font-medium text-blue-950">Excel or CSV</label>
        <input
          type="file"
          accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-blue-800 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
        />

        <button
          type="button"
          disabled={busy}
          onClick={() => void upload()}
          className="w-full rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 py-3 text-sm font-semibold text-white shadow-md shadow-blue-900/20 transition hover:from-blue-500 hover:to-blue-600 disabled:opacity-50"
        >
          {busy ? "Working…" : "Upload file"}
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => void loadSample()}
          className="w-full rounded-xl border-2 border-blue-200 bg-white py-3 text-sm font-medium text-blue-800 transition hover:bg-blue-50 disabled:opacity-50"
        >
          Load sample CSV (demo)
        </button>
      </div>

      {error && (
        <p className="rounded-lg border-2 border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      )}
      {status && (
        <p className="rounded-lg border-2 border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">{status}</p>
      )}
    </div>
  );
}
