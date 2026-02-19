import { crawlUrl } from "./crawl4ai";

export interface TedxEvent {
  slug: string;
  name: string;
  event_date: string | null;
  city: string | null;
  country: string | null;
  event_type: string | null;
  url: string;
  raw_data: object;
}

// Suffixes that ted.com appends to event names in the table
const EVENT_TYPES = [
  "TEDxWomen",
  "TEDxYouth",
  "University",
  "Standard",
  "Salon",
  "Youth",
  "Studio",
  "Women",
];

function cleanSoftHyphens(text: string): string {
  return text.replace(/\u00ad/g, "").replace(/\s+/g, " ").trim();
}

function slugify(name: string, date: string | null): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const year = date?.match(/\d{4}/)?.[0] ?? "";
  return year ? `${base}-${year}` : base;
}

function parseDateString(raw: string): string | null {
  // "Date\nFebruary 18, 2026" → "2026-02-18"
  const match = raw.match(/([A-Za-z]+ \d+, \d{4})/);
  if (!match) return null;
  const d = new Date(match[1]);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}

function parseNameAndType(raw: string): { name: string; event_type: string | null } {
  const text = cleanSoftHyphens(
    raw.replace(/^Event name\n?/, "").trim()
  );

  for (const t of EVENT_TYPES) {
    if (text.endsWith(t)) {
      return { name: text.slice(0, -t.length).trim(), event_type: t };
    }
  }
  return { name: text, event_type: null };
}

function extractLocations(html: string): Array<{ city: string; country: string }> {
  const results: Array<{ city: string; country: string }> = [];
  const regex = /<td>\s*<div>Location<\/div>\s*([^<]+?)<br>([^<\n]+?)<\/td>/g;
  for (const m of html.matchAll(regex)) {
    results.push({ city: m[1].trim(), country: m[2].trim() });
  }
  return results;
}

const MAX_PAGES = 50;

export async function scrapeTedxEvents(): Promise<TedxEvent[]> {
  const allEvents: TedxEvent[] = [];
  let pageIndex = 1;
  let hasMore = true;

  while (hasMore && pageIndex <= MAX_PAGES) {
    const url = `https://www.ted.com/tedx/events?when=future&page=${pageIndex}`;
    console.log(`Scraping page ${pageIndex}: ${url}`);

    const result = await crawlUrl(url);

    if (!result.success || !result.result) {
      console.error(`Failed to scrape page ${pageIndex}:`, result.error);
      break;
    }

    const { tables, links, cleaned_html } = result.result;
    const table = tables?.[0];

    if (!table || table.rows.length === 0) {
      hasMore = false;
      break;
    }

    // Build URL map: clean name (lowercase) → full URL
    const urlMap = new Map<string, string>();
    for (const link of links?.internal ?? []) {
      if (link.href && /\/tedx\/events\/\d+$/.test(link.href)) {
        const key = cleanSoftHyphens(link.text ?? "").toLowerCase();
        if (key) urlMap.set(key, link.href);
      }
    }

    // City/country come from HTML (table text loses the <br> separator)
    const locations = extractLocations(cleaned_html ?? "");
    let locationIdx = 0;
    let eventsOnPage = 0;

    for (const row of table.rows) {
      if (row.length < 3) continue;

      const dateCell = row[0];
      const nameCell = row[1];

      // Skip group-header rows ("Today", "Tomorrow", plain date strings without \n)
      if (!dateCell.includes("\n")) continue;

      const event_date = parseDateString(dateCell);
      const { name, event_type } = parseNameAndType(nameCell);
      const location = locations[locationIdx++] ?? null;

      if (!name) continue;

      const eventUrl =
        urlMap.get(name.toLowerCase()) ?? "https://www.ted.com/tedx/events";
      const slug = slugify(name, event_date);

      allEvents.push({
        slug,
        name,
        event_date,
        city: location?.city ?? null,
        country: location?.country ?? null,
        event_type,
        url: eventUrl,
        raw_data: { date: dateCell, name: nameCell, location: row[2] },
      });

      eventsOnPage++;
    }

    console.log(`Page ${pageIndex}: ${eventsOnPage} events`);

    if (eventsOnPage === 0) {
      hasMore = false;
      break;
    }

    pageIndex++;
    await new Promise((r) => setTimeout(r, 500));
  }

  return allEvents;
}
