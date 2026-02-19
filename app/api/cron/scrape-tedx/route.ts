import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { scrapeTedxEvents } from "@/lib/tedx-scraper";

export const maxDuration = 300; // 5 minutos (plan Pro de Vercel)

export async function GET(req: NextRequest) {
  // Verificar que la llamada viene de Vercel Cron o tiene el token correcto
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("Starting TEDx scrape...");
    const events = await scrapeTedxEvents();
    console.log(`Scraped ${events.length} events`);

    if (events.length === 0) {
      return NextResponse.json({ message: "No events found", inserted: 0 });
    }

    let inserted = 0;
    let skipped = 0;

    for (const event of events) {
      const result = await sql`
        INSERT INTO tedx_events (slug, name, event_date, city, country, event_type, url, raw_data)
        VALUES (
          ${event.slug},
          ${event.name},
          ${event.event_date},
          ${event.city},
          ${event.country},
          ${event.event_type},
          ${event.url},
          ${JSON.stringify(event.raw_data)}
        )
        ON CONFLICT (slug) DO UPDATE SET
          name       = EXCLUDED.name,
          event_date = EXCLUDED.event_date,
          city       = EXCLUDED.city,
          country    = EXCLUDED.country,
          event_type = EXCLUDED.event_type,
          url        = EXCLUDED.url,
          raw_data   = EXCLUDED.raw_data,
          updated_at = NOW()
        WHERE
          tedx_events.name       IS DISTINCT FROM EXCLUDED.name OR
          tedx_events.event_date IS DISTINCT FROM EXCLUDED.event_date OR
          tedx_events.city       IS DISTINCT FROM EXCLUDED.city OR
          tedx_events.country    IS DISTINCT FROM EXCLUDED.country
      `;

      // neon devuelve rowCount en el resultado
      if (Array.isArray(result) && result.length > 0) {
        inserted++;
      } else {
        skipped++;
      }
    }

    console.log(`Done. Inserted/updated: ${inserted}, skipped: ${skipped}`);

    return NextResponse.json({
      success: true,
      total: events.length,
      inserted,
      skipped,
    });
  } catch (error) {
    console.error("Scrape error:", error);
    return NextResponse.json(
      { error: "Scrape failed", detail: String(error) },
      { status: 500 }
    );
  }
}
