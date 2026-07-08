/**
 * crawl.ts — Direct scraper for ted.com/tedx/events
 *
 * Reemplaza la dependencia de Crawl4AI (servidor externo).
 * Usa fetch + parseo HTML nativo, sin dependencias extra.
 */

export interface CrawlResult {
  success: boolean;
  result?: {
    tables?: Array<{ headers: string[]; rows: string[][] }>;
    links?: { internal: Array<{ href: string; text: string }> };
    cleaned_html?: string;
  };
  error?: string;
}

const BASE_URL = "https://www.ted.com";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

// ─── HTML helpers ────────────────────────────────────────────────────────────

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

function extractText(html: string): string {
  // Replace <br> with newline before stripping tags
  const withNewlines = html.replace(/<br\s*\/?>/gi, "\n");
  return decodeHtmlEntities(stripTags(withNewlines)).replace(/\s+/g, " ").trim();
}

// ─── Table parser ─────────────────────────────────────────────────────────────

function parseTables(
  html: string
): Array<{ headers: string[]; rows: string[][] }> {
  const tables: Array<{ headers: string[]; rows: string[][] }> = [];
  const tableRegex = /<table[\s\S]*?<\/table>/gi;

  for (const tableMatch of html.matchAll(tableRegex)) {
    const tableHtml = tableMatch[0];

    // Headers
    const headers: string[] = [];
    const thRegex = /<th[\s\S]*?>([\s\S]*?)<\/th>/gi;
    for (const th of tableHtml.matchAll(thRegex)) {
      headers.push(extractText(th[1]));
    }

    // Rows (tbody only)
    const rows: string[][] = [];
    const trRegex = /<tr[\s\S]*?>([\s\S]*?)<\/tr>/gi;
    for (const tr of tableHtml.matchAll(trRegex)) {
      const rowHtml = tr[1];
      // Skip header rows
      if (/<th/i.test(rowHtml)) continue;

      const cells: string[] = [];
      const tdRegex = /<td[\s\S]*?>([\s\S]*?)<\/td>/gi;
      for (const td of rowHtml.matchAll(tdRegex)) {
        // Preserve <br> as \n for date/location parsing
        const cellHtml = td[1].replace(/<br\s*\/?>/gi, "\n");
        cells.push(decodeHtmlEntities(stripTags(cellHtml)).trim());
      }
      if (cells.length > 0) rows.push(cells);
    }

    if (rows.length > 0) {
      tables.push({ headers, rows });
    }
  }

  return tables;
}

// ─── Link parser ──────────────────────────────────────────────────────────────

function parseInternalLinks(
  html: string
): Array<{ href: string; text: string }> {
  const links: Array<{ href: string; text: string }> = [];
  const aRegex = /<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

  for (const m of html.matchAll(aRegex)) {
    const href = m[1];
    const text = extractText(m[2]);

    // Only internal event links
    if (href.startsWith("/tedx/events/") || href.startsWith(BASE_URL + "/tedx/events/")) {
      const fullHref = href.startsWith("http") ? href : BASE_URL + href;
      if (/\/tedx\/events\/\d+$/.test(fullHref)) {
        links.push({ href: fullHref, text });
      }
    }
  }

  return links;
}

// ─── Location parser ──────────────────────────────────────────────────────────
// Kept for compatibility with tedx-scraper.ts which calls extractLocations on cleaned_html

// ─── Main crawl function ──────────────────────────────────────────────────────

export async function crawlUrl(url: string): Promise<CrawlResult> {
  try {
    const response = await fetch(url, {
      headers: HEADERS,
      // Vercel edge/serverless: no cache
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status} ${response.statusText}`,
      };
    }

    const html = await response.text();

    const tables = parseTables(html);
    const internalLinks = parseInternalLinks(html);

    return {
      success: true,
      result: {
        tables,
        links: { internal: internalLinks },
        // Pass raw HTML so extractLocations() in tedx-scraper.ts still works
        cleaned_html: html,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
