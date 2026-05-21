"use client";

import { useCallback, useId, useRef, useState } from "react";

type Props = {
  initialTotal: number;
};

/** Broad accept list — strict MIME-only breaks file pickers in Android WebView / Flutter. */
const FILE_ACCEPT =
  ".csv,.xlsx,.xls,text/csv,text/comma-separated-values,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream,*/*";

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
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const clearFileInput = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] ?? null;
    setFile(picked);
    setError(null);
    setStatus(null);
  };

  const openFilePicker = () => {
    clearFileInput();
    fileInputRef.current?.click();
  };

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
      clearFileInput();
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
    <div className="mx-auto w-full min-w-0 max-w-lg space-y-6 bg-[#f0f7ff] px-4 py-6 sm:px-6 sm:py-8">
      <p className="rounded-xl border border-blue-100/90 bg-white px-4 py-3 text-sm text-blue-900 shadow-sm ring-1 ring-blue-950/[0.03]">
        Current database: <strong className="tabular-nums text-blue-950">{total}</strong> items
      </p>

      <div className="space-y-4 rounded-2xl border border-blue-100/90 bg-white p-4 shadow-[0_4px_24px_-10px_rgba(30,58,138,0.12)] ring-1 ring-blue-950/[0.03] sm:p-6">
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-blue-950">Import mode</legend>
          <label className="flex items-start gap-2 text-sm text-blue-800">
            <input
              type="radio"
              name="mode"
              className="mt-1 shrink-0"
              checked={mode === "append"}
              onChange={() => setMode("append")}
            />
            Append / update by code+series (safe for adding new rows)
          </label>
          <label className="flex items-start gap-2 text-sm text-blue-800">
            <input
              type="radio"
              name="mode"
              className="mt-1 shrink-0"
              checked={mode === "replace"}
              onChange={() => setMode("replace")}
            />
            Replace all (deletes existing data, then imports this file)
          </label>
        </fieldset>

        <div className="space-y-2">
          <span className="block text-sm font-medium text-blue-950">Excel or CSV</span>

          {/* Hidden native input — opened via label + button (works better in Flutter WebView). */}
          <input
            ref={fileInputRef}
            id={fileInputId}
            type="file"
            accept={FILE_ACCEPT}
            className="sr-only"
            aria-hidden
            tabIndex={-1}
            onChange={onFileChange}
          />

          <label
            htmlFor={fileInputId}
            className="flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/80 px-4 py-3 text-center text-sm font-semibold text-blue-800 transition hover:border-blue-400 hover:bg-blue-100 active:bg-blue-100"
          >
            {file ? "Change file" : "Choose file"}
          </label>

          <button
            type="button"
            disabled={busy}
            onClick={openFilePicker}
            className="w-full min-h-11 rounded-xl border border-blue-200 bg-white py-2.5 text-sm font-medium text-blue-800 transition hover:bg-blue-50 disabled:opacity-50"
          >
            Open file picker again
          </button>

          {file && (
            <p className="break-all rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-900">
              Selected: <strong>{file.name}</strong>
              {file.size > 0 && (
                <span className="text-blue-700/80"> ({Math.round(file.size / 1024)} KB)</span>
              )}
            </p>
          )}
        </div>

        <button
          type="button"
          disabled={busy || !file}
          onClick={() => void upload()}
          className="w-full min-h-12 rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 py-3 text-sm font-semibold text-white shadow-md shadow-blue-900/20 transition hover:from-blue-500 hover:to-blue-600 disabled:opacity-50"
        >
          {busy ? "Working…" : "Upload file"}
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => void loadSample()}
          className="w-full min-h-11 rounded-xl border-2 border-blue-200 bg-white py-3 text-sm font-medium text-blue-800 transition hover:bg-blue-50 disabled:opacity-50"
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
