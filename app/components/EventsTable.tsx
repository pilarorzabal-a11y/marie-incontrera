"use client";

import { useState, useEffect, useRef, useTransition, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { TedxEvent } from "../page";

const ALL_COLUMNS = [
  { key: "name",              label: "Nombre",        defaultVisible: true  },
  { key: "event_date",        label: "Fecha",         defaultVisible: true  },
  { key: "city",              label: "Ciudad",        defaultVisible: true  },
  { key: "country",           label: "País",          defaultVisible: true  },
  { key: "event_type",        label: "Tipo",          defaultVisible: true  },
  { key: "enrichment_status", label: "Estado",        defaultVisible: true  },
  { key: "contact_email",     label: "Email",         defaultVisible: false },
  { key: "speaker_app_url",   label: "Formulario",    defaultVisible: false },
  { key: "website",           label: "Sitio web",     defaultVisible: false },
  { key: "deadline",          label: "Deadline",      defaultVisible: false },
  { key: "theme",             label: "Tema",          defaultVisible: false },
  { key: "notes",             label: "Notas",         defaultVisible: false },
  { key: "facebook",          label: "Facebook",      defaultVisible: false },
  { key: "twitter",           label: "Twitter/X",     defaultVisible: false },
  { key: "instagram",         label: "Instagram",     defaultVisible: false },
  { key: "linkedin",          label: "LinkedIn",      defaultVisible: false },
  { key: "url",               label: "Link TED",      defaultVisible: false },
  { key: "id",                label: "ID",            defaultVisible: false },
  { key: "slug",              label: "Slug",          defaultVisible: false },
  { key: "scraped_at",        label: "Scrapeado",     defaultVisible: false },
  { key: "updated_at",        label: "Actualizado",   defaultVisible: false },
] as const;

type ColumnKey = (typeof ALL_COLUMNS)[number]["key"];

const STORAGE_KEY_VISIBLE = "tedx-visible-columns-v2";
const STORAGE_KEY_ORDER = "tedx-column-order-v1";
const DEFAULT_VISIBLE = new Set<ColumnKey>(
  ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key)
);
const DEFAULT_ORDER = ALL_COLUMNS.map((c) => c.key);

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending: { label: "En cola",     cls: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  running: { label: "Buscando…",   cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  done:    { label: "✓ Listo",     cls: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  failed:  { label: "✗ Error",     cls: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
};

const EDITABLE_KEYS = new Set<ColumnKey>([
  "name",
  "event_date",
  "city",
  "country",
  "event_type",
  "url",
  "deadline",
  "speaker_app_url",
  "website",
  "contact_email",
  "facebook",
  "twitter",
  "instagram",
  "linkedin",
  "theme",
  "notes",
]);

const DATE_KEYS = new Set<ColumnKey>(["event_date", "deadline"]);

interface Props {
  events: TedxEvent[];
  total: number;
  currentPage: number;
  totalPages: number;
  filters: { search: string; country: string; type: string; from: string; to: string };
}

export default function EventsTable({ events, total, currentPage, totalPages, filters }: Props) {
  const [visibleCols, setVisibleCols] = useState<Set<ColumnKey>>(DEFAULT_VISIBLE);
  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(DEFAULT_ORDER);
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [enriching, setEnriching] = useState(false);
  const [localEvents, setLocalEvents] = useState<TedxEvent[]>(events);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ id: number; key: ColumnKey } | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const [savingCell, setSavingCell] = useState(false);
  const evtSourceRef = useRef<EventSource | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    try {
      const storedVisible = localStorage.getItem(STORAGE_KEY_VISIBLE);
      if (storedVisible) {
        const keys = JSON.parse(storedVisible) as ColumnKey[];
        setVisibleCols(new Set(keys.filter((k) => DEFAULT_ORDER.includes(k))));
      }

      const storedOrder = localStorage.getItem(STORAGE_KEY_ORDER);
      if (storedOrder) {
        const keys = JSON.parse(storedOrder) as ColumnKey[];
        const valid = keys.filter((k) => DEFAULT_ORDER.includes(k));
        const missing = DEFAULT_ORDER.filter((k) => !valid.includes(k));
        setColumnOrder([...valid, ...missing]);
      }
    } catch {}
  }, []);

  // Sync localEvents when server-side data changes (page navigation / router.refresh)
  useEffect(() => { setLocalEvents(events); }, [events]);

  // Clear selection when page changes
  useEffect(() => { setSelectedIds(new Set()); }, [currentPage]);

  // Close SSE on unmount
  useEffect(() => () => { evtSourceRef.current?.close(); }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setColMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggleColumn = (key: ColumnKey) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size === 1) return prev;
        next.delete(key);
      } else {
        next.add(key);
      }
      try { localStorage.setItem(STORAGE_KEY_VISIBLE, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const moveColumn = (key: ColumnKey, direction: -1 | 1) => {
    setColumnOrder((prev) => {
      const idx = prev.indexOf(key);
      const nextIdx = idx + direction;
      if (idx < 0 || nextIdx < 0 || nextIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[nextIdx]] = [next[nextIdx], next[idx]];
      try { localStorage.setItem(STORAGE_KEY_ORDER, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allSelected = localEvents.length > 0 && localEvents.every((e) => selectedIds.has(e.id));
  const someSelected = localEvents.some((e) => selectedIds.has(e.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        localEvents.forEach((e) => next.delete(e.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        localEvents.forEach((e) => next.add(e.id));
        return next;
      });
    }
  };

  const handleEnrich = useCallback(async () => {
    const ids = [...selectedIds];
    setEnriching(true);
    setProgress({ current: 0, total: ids.length });

    // Optimistically mark rows as pending
    setLocalEvents((prev) =>
      prev.map((e) => (ids.includes(e.id) ? { ...e, enrichment_status: "pending" } : e))
    );

    // Persist pending status in DB before running enrichment stream.
    try {
      await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
    } catch {}

    const evtSource = new EventSource(`/api/enrich/run?ids=${ids.join(",")}`);
    evtSourceRef.current = evtSource;

    evtSource.onmessage = (e) => {
      const msg = JSON.parse(e.data) as {
        type: string;
        id?: number;
        event?: TedxEvent;
        message?: string;
      };

      if (msg.type === "start" && msg.id != null) {
        setLocalEvents((prev) =>
          prev.map((ev) =>
            ev.id === msg.id ? { ...ev, enrichment_status: "running" } : ev
          )
        );
      }

      if (msg.type === "result" && msg.id != null && msg.event) {
        setLocalEvents((prev) =>
          prev.map((ev) => (ev.id === msg.id ? { ...ev, ...msg.event } : ev))
        );
        setProgress((p) => (p ? { ...p, current: p.current + 1 } : p));
      }

      if (msg.type === "error" && msg.id != null) {
        setLocalEvents((prev) =>
          prev.map((ev) =>
            ev.id === msg.id ? { ...ev, enrichment_status: "failed" } : ev
          )
        );
        setProgress((p) => (p ? { ...p, current: p.current + 1 } : p));
      }

      if (msg.type === "done") {
        evtSource.close();
        setEnriching(false);
        setSelectedIds(new Set());
        setProgress(null);
        startTransition(() => router.refresh());
      }
    };

    evtSource.onerror = () => {
      evtSource.close();
      setEnriching(false);
      setProgress(null);
      startTransition(() => router.refresh());
    };
  }, [router, selectedIds, startTransition]);

  const goToPage = (page: number) => {
    const params = new URLSearchParams();
    if (filters.search)  params.set("search",  filters.search);
    if (filters.country) params.set("country", filters.country);
    if (filters.type)    params.set("type",    filters.type);
    if (filters.from)    params.set("from",    filters.from);
    if (filters.to)      params.set("to",      filters.to);
    params.set("page", String(page));
    router.push(`${pathname}?${params.toString()}`);
  };

  const orderedColumns = columnOrder
    .map((key) => ALL_COLUMNS.find((c) => c.key === key))
    .filter((c): c is (typeof ALL_COLUMNS)[number] => Boolean(c));

  const columns = orderedColumns.filter((c) =>
    mounted ? visibleCols.has(c.key) : c.defaultVisible
  );

  function getRawValue(event: TedxEvent, key: ColumnKey) {
    const value = event[key as keyof TedxEvent];
    if (value == null) return "";
    return String(value);
  }

  function beginEdit(event: TedxEvent, key: ColumnKey) {
    if (!EDITABLE_KEYS.has(key)) return;
    setEditingCell({ id: event.id, key });
    setDraftValue(getRawValue(event, key));
  }

  async function saveEdit(eventId: number, key: ColumnKey, value: string) {
    if (!EDITABLE_KEYS.has(key) || savingCell) return;
    setSavingCell(true);
    try {
      const payload: Record<string, string | null> = {
        [key]: value.trim() === "" ? null : value,
      };
      const resp = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await resp.json();
      if (!resp.ok) {
        throw new Error(body?.error || "No se pudo guardar");
      }
      const updated = body.event as TedxEvent;
      setLocalEvents((prev) =>
        prev.map((e) => (e.id === updated.id ? { ...e, ...updated } : e))
      );
      setEditingCell(null);
      setDraftValue("");
    } catch (err) {
      console.error(err);
    } finally {
      setSavingCell(false);
    }
  }

  function fmtDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("es-AR", {
      day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
    });
  }

  function cellValue(event: TedxEvent, key: ColumnKey) {
    switch (key) {
      case "name":
        return (
          <a
            href={event.url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-zinc-900 dark:text-white hover:text-red-600 transition-colors"
          >
            {event.name}
          </a>
        );
      case "event_date":
        return <span className="whitespace-nowrap text-zinc-600 dark:text-zinc-300">{fmtDate(event.event_date)}</span>;
      case "city":
        return <span className="text-zinc-600 dark:text-zinc-300">{event.city ?? "—"}</span>;
      case "country":
        return <span className="text-zinc-600 dark:text-zinc-300">{event.country ?? "—"}</span>;
      case "event_type":
        return event.event_type ? (
          <span className="text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded-full whitespace-nowrap">
            {event.event_type}
          </span>
        ) : <span className="text-zinc-400">—</span>;
      case "enrichment_status": {
        const s = event.enrichment_status;
        if (!s) return <span className="text-zinc-300 dark:text-zinc-600 text-xs">—</span>;
        const cfg = STATUS_CONFIG[s] ?? { label: s, cls: "bg-zinc-100 text-zinc-600" };
        return (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${cfg.cls}`}>
            {cfg.label}
          </span>
        );
      }
      case "contact_email":
        return event.contact_email ? (
          <a href={`mailto:${event.contact_email}`} className="text-red-600 hover:underline text-xs whitespace-nowrap">
            {event.contact_email}
          </a>
        ) : <span className="text-zinc-300 dark:text-zinc-600">—</span>;
      case "speaker_app_url":
        return event.speaker_app_url ? (
          <a href={event.speaker_app_url} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline text-xs whitespace-nowrap">
            Aplicar →
          </a>
        ) : <span className="text-zinc-300 dark:text-zinc-600">—</span>;
      case "website":
        return event.website ? (
          <a href={event.website} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline text-xs whitespace-nowrap">
            Ver sitio →
          </a>
        ) : <span className="text-zinc-300 dark:text-zinc-600">—</span>;
      case "deadline":
        return <span className="whitespace-nowrap text-zinc-600 dark:text-zinc-300">{fmtDate(event.deadline)}</span>;
      case "theme":
        return <span className="text-zinc-600 dark:text-zinc-300 text-xs">{event.theme ?? "—"}</span>;
      case "notes":
        return <span className="text-zinc-500 text-xs max-w-48 truncate block">{event.notes ?? "—"}</span>;
      case "facebook":
        return event.facebook ? (
          <a href={event.facebook} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">FB</a>
        ) : <span className="text-zinc-300 dark:text-zinc-600">—</span>;
      case "twitter":
        return event.twitter ? (
          <a href={event.twitter} target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:underline text-xs">X</a>
        ) : <span className="text-zinc-300 dark:text-zinc-600">—</span>;
      case "instagram":
        return event.instagram ? (
          <a href={event.instagram} target="_blank" rel="noopener noreferrer" className="text-pink-500 hover:underline text-xs">IG</a>
        ) : <span className="text-zinc-300 dark:text-zinc-600">—</span>;
      case "linkedin":
        return event.linkedin ? (
          <a href={event.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline text-xs">LI</a>
        ) : <span className="text-zinc-300 dark:text-zinc-600">—</span>;
      case "url":
        return event.url ? (
          <a href={event.url} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline text-xs whitespace-nowrap">
            ted.com →
          </a>
        ) : <span className="text-zinc-400">—</span>;
      case "id":
        return <span className="text-zinc-400 text-xs font-mono">{event.id}</span>;
      case "slug":
        return <span className="text-zinc-400 text-xs font-mono truncate max-w-48 block">{event.slug}</span>;
      case "scraped_at":
        return <span className="text-zinc-500 text-xs whitespace-nowrap">{fmtDate(event.scraped_at)}</span>;
      case "updated_at":
        return <span className="text-zinc-500 text-xs whitespace-nowrap">{fmtDate(event.updated_at)}</span>;
    }
  }

  const from = (currentPage - 1) * 50 + 1;
  const to = Math.min(currentPage * 50, total);

  return (
    <div className="mt-4 flex-1 min-h-0 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-zinc-500">
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            {total.toLocaleString("es-AR")}
          </span>{" "}
          eventos
          {totalPages > 1 && (
            <span className="ml-1">
              — mostrando {from.toLocaleString("es-AR")}–{to.toLocaleString("es-AR")}
            </span>
          )}
        </p>

        {/* Column picker */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setColMenuOpen((o) => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Columnas
          </button>

          {colMenuOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg p-3 min-w-44 max-h-96 overflow-y-auto">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Columnas visibles
              </p>
              {orderedColumns.map((col, idx) => (
                <div key={col.key} className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    checked={mounted ? visibleCols.has(col.key) : col.defaultVisible}
                    onChange={() => toggleColumn(col.key)}
                    className="accent-red-600 w-3.5 h-3.5"
                  />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300 flex-1">
                    {col.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => moveColumn(col.key, -1)}
                    disabled={idx === 0}
                    className="px-1.5 py-0.5 text-xs rounded border border-zinc-200 dark:border-zinc-700 disabled:opacity-30"
                    aria-label={`Mover ${col.label} arriba`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveColumn(col.key, 1)}
                    disabled={idx === orderedColumns.length - 1}
                    className="px-1.5 py-0.5 text-xs rounded border border-zinc-200 dark:border-zinc-700 disabled:opacity-30"
                    aria-label={`Mover ${col.label} abajo`}
                  >
                    ↓
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto overscroll-contain rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <table className="min-w-full w-max text-sm">
          <thead>
            <tr className="sticky top-0 z-10 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
              {/* Checkbox column */}
              <th className="px-3 py-3 w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                  onChange={toggleSelectAll}
                  className="accent-red-600 w-3.5 h-3.5 cursor-pointer"
                />
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {localEvents.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-16 text-center text-zinc-400">
                  No se encontraron eventos.
                </td>
              </tr>
            ) : (
              localEvents.map((event, i) => {
                const isSelected = selectedIds.has(event.id);
                return (
                  <tr
                    key={event.slug}
                    className={`border-b border-zinc-100 dark:border-zinc-800 last:border-0 transition-colors ${
                      isSelected
                        ? "bg-red-50 dark:bg-red-900/10"
                        : i % 2 === 1
                        ? "bg-zinc-50/50 dark:bg-zinc-950/50 hover:bg-red-50/30 dark:hover:bg-red-900/10"
                        : "hover:bg-red-50/30 dark:hover:bg-red-900/10"
                    }`}
                  >
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(event.id)}
                        className="accent-red-600 w-3.5 h-3.5 cursor-pointer"
                      />
                    </td>
                    {columns.map((col) => {
                      const isEditing =
                        editingCell?.id === event.id && editingCell.key === col.key;
                      const editable = EDITABLE_KEYS.has(col.key);
                      const inputType = DATE_KEYS.has(col.key) ? "date" : "text";

                      return (
                        <td key={col.key} className="px-4 py-2.5">
                          {isEditing ? (
                            <input
                              autoFocus
                              type={inputType}
                              value={draftValue}
                              onChange={(e) => setDraftValue(e.target.value)}
                              onBlur={() => saveEdit(event.id, col.key, draftValue)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  saveEdit(event.id, col.key, draftValue);
                                }
                                if (e.key === "Escape") {
                                  setEditingCell(null);
                                  setDraftValue("");
                                }
                              }}
                              className="w-full min-w-40 px-2 py-1 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                            />
                          ) : (
                            <div
                              onDoubleClick={() => beginEdit(event, col.key)}
                              title={editable ? "Doble click para editar" : ""}
                              className={editable ? "cursor-text" : ""}
                            >
                              {cellValue(event, col.key)}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-4 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            ← Anterior
          </button>

          <span className="text-sm text-zinc-500">
            Página <span className="font-medium text-zinc-800 dark:text-zinc-200">{currentPage}</span> de {totalPages}
          </span>

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-4 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* Floating action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-5 py-3 rounded-2xl shadow-2xl border border-zinc-800 dark:border-zinc-200">
          <span className="text-sm font-medium">
            {selectedIds.size} evento{selectedIds.size !== 1 ? "s" : ""} seleccionado{selectedIds.size !== 1 ? "s" : ""}
          </span>
          <button
            onClick={handleEnrich}
            disabled={enriching || isPending}
            className="px-4 py-1.5 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors whitespace-nowrap"
          >
            {enriching
              ? `Buscando ${progress?.current ?? 0}/${progress?.total ?? 0}…`
              : "Buscar info →"}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-zinc-400 hover:text-zinc-200 dark:text-zinc-500 dark:hover:text-zinc-800 text-xs transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
