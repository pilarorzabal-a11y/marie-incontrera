"use client";

import { useState } from "react";

export default function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPrompt = async () => {
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const resp = await fetch("/api/settings/prompt");
      const body = await resp.json();
      if (!resp.ok) throw new Error(body?.error || "No se pudo cargar el prompt");
      setPrompt(body.prompt || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const openPanel = async () => {
    setOpen(true);
    await loadPrompt();
  };

  const savePrompt = async () => {
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const resp = await fetch("/api/settings/prompt", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const body = await resp.json();
      if (!resp.ok) throw new Error(body?.error || "No se pudo guardar");
      setStatus("Prompt actualizado en el agente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={openPanel}
        className="px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        Settings
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] bg-black/40 p-4 sm:p-8">
          <div className="mx-auto h-full max-w-4xl bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                Agent System Prompt
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="px-2 py-1 text-xs border border-zinc-200 dark:border-zinc-700 rounded"
              >
                Cerrar
              </button>
            </div>

            <div className="p-4 flex-1 min-h-0 flex flex-col gap-3">
              {loading ? (
                <p className="text-sm text-zinc-500">Cargando prompt...</p>
              ) : (
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="flex-1 min-h-0 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 p-3 text-sm font-mono"
                />
              )}

              {error && <p className="text-xs text-red-600">{error}</p>}
              {status && <p className="text-xs text-green-600">{status}</p>}
            </div>

            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2">
              <button
                onClick={loadPrompt}
                disabled={loading || saving}
                className="px-3 py-1.5 text-sm border border-zinc-200 dark:border-zinc-700 rounded disabled:opacity-50"
              >
                Recargar
              </button>
              <button
                onClick={savePrompt}
                disabled={loading || saving}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

