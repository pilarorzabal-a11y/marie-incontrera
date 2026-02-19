"use client";

interface FilterBarProps {
  countries: string[];
  types: string[];
  current: {
    search: string;
    country: string;
    type: string;
    from: string;
    to: string;
  };
}

export default function FilterBar({ countries, types, current }: FilterBarProps) {
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.currentTarget.form?.requestSubmit();
  };

  const hasFilters = !!(
    current.search || current.country || current.type || current.from || current.to
  );

  return (
    <form method="GET" className="flex flex-wrap gap-2">
      <input
        name="search"
        type="search"
        placeholder="Buscar por nombre..."
        defaultValue={current.search}
        className="flex-1 min-w-48 px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-600"
      />

      <select
        name="country"
        defaultValue={current.country}
        onChange={handleSelectChange}
        className="px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
      >
        <option value="">Todos los países</option>
        {countries.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <select
        name="type"
        defaultValue={current.type}
        onChange={handleSelectChange}
        className="px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
      >
        <option value="">Todos los tipos</option>
        {types.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      <div className="flex items-center gap-1.5">
        <input
          name="from"
          type="date"
          defaultValue={current.from}
          className="px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
        />
        <span className="text-zinc-400 text-xs">—</span>
        <input
          name="to"
          type="date"
          defaultValue={current.to}
          className="px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
        />
      </div>

      <button
        type="submit"
        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
      >
        Filtrar
      </button>

      {hasFilters && (
        <a
          href="/"
          className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          Limpiar
        </a>
      )}
    </form>
  );
}
