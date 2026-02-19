import { sql } from "@/lib/db";
import FilterBar from "./components/FilterBar";
import EventsTable from "./components/EventsTable";
import SettingsPanel from "./components/SettingsPanel";

const PAGE_SIZE = 50;

export interface TedxEvent {
  id: number;
  slug: string;
  name: string;
  event_date: string | null;
  city: string | null;
  country: string | null;
  event_type: string | null;
  url: string | null;
  scraped_at: string | null;
  updated_at: string | null;
  // enrichment
  deadline: string | null;
  speaker_app_url: string | null;
  website: string | null;
  contact_email: string | null;
  facebook: string | null;
  twitter: string | null;
  instagram: string | null;
  linkedin: string | null;
  theme: string | null;
  notes: string | null;
  enrichment_status: string | null;
  enriched_at: string | null;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    country?: string;
    type?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const {
    search = "",
    country = "",
    type = "",
    from = "",
    to = "",
    page = "1",
  } = await searchParams;

  const currentPage = Math.max(1, parseInt(page) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;
  const searchLike = "%" + search + "%";
  const fromDate = from || null;
  const toDate = to || null;

  const [events, countResult, countries, types] = await Promise.all([
    sql`
      SELECT id, slug, name, event_date::text, city, country, event_type, url,
             scraped_at::text, updated_at::text,
             deadline::text, speaker_app_url, website, contact_email,
             facebook, twitter, instagram, linkedin, theme, notes,
             enrichment_status, enriched_at::text
      FROM tedx_events
      WHERE
        (${search} = '' OR name ILIKE ${searchLike})
        AND (${country} = '' OR country = ${country})
        AND (${type} = '' OR event_type = ${type})
        AND (${fromDate}::date IS NULL OR event_date >= ${fromDate}::date)
        AND (${toDate}::date IS NULL OR event_date <= ${toDate}::date)
      ORDER BY event_date ASC NULLS LAST
      LIMIT ${PAGE_SIZE} OFFSET ${offset}
    `,
    sql`
      SELECT COUNT(*)::int AS total
      FROM tedx_events
      WHERE
        (${search} = '' OR name ILIKE ${searchLike})
        AND (${country} = '' OR country = ${country})
        AND (${type} = '' OR event_type = ${type})
        AND (${fromDate}::date IS NULL OR event_date >= ${fromDate}::date)
        AND (${toDate}::date IS NULL OR event_date <= ${toDate}::date)
    `,
    sql`SELECT DISTINCT country FROM tedx_events WHERE country IS NOT NULL ORDER BY country`,
    sql`SELECT DISTINCT event_type FROM tedx_events WHERE event_type IS NOT NULL ORDER BY event_type`,
  ]);

  const eventList = events as TedxEvent[];
  const total = (countResult[0] as { total: number }).total;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-red-600">TEDx</span>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                Eventos futuros
              </h1>
            </div>
            <SettingsPanel />
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 w-full max-w-screen-xl mx-auto px-4 sm:px-6 py-6 flex flex-col">
        <FilterBar
          countries={countries.map((r) => r.country as string)}
          types={types.map((r) => r.event_type as string)}
          current={{ search, country, type, from, to }}
        />

        <EventsTable
          events={eventList}
          total={total}
          currentPage={currentPage}
          totalPages={totalPages}
          filters={{ search, country, type, from, to }}
        />
      </main>
    </div>
  );
}
