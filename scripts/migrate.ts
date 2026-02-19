import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  await sql`
    CREATE TABLE IF NOT EXISTS tedx_events (
      id           SERIAL PRIMARY KEY,
      slug         TEXT UNIQUE NOT NULL,
      name         TEXT NOT NULL,
      event_date   DATE,
      city         TEXT,
      country      TEXT,
      event_type   TEXT,
      url          TEXT,
      raw_data     JSONB,
      scraped_at   TIMESTAMPTZ DEFAULT NOW(),
      updated_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_tedx_events_slug ON tedx_events (slug)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_tedx_events_event_date ON tedx_events (event_date)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_tedx_events_country ON tedx_events (country)
  `;

  console.log("Migration complete.");
}

migrate().catch(console.error);
