import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

const EDITABLE_FIELDS = new Set([
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

const DATE_FIELDS = new Set(["event_date", "deadline"]);

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const eventId = Number(id);
  if (!Number.isFinite(eventId) || eventId <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const entries = Object.entries(payload).filter(([k]) => EDITABLE_FIELDS.has(k));
  if (entries.length === 0) {
    return NextResponse.json({ error: "No editable fields provided" }, { status: 400 });
  }

  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const [field, raw] of entries) {
    const value = typeof raw === "string" ? raw.trim() : raw;
    values.push(value === "" ? null : value);
    if (DATE_FIELDS.has(field)) {
      sets.push(`${field} = $${idx}::date`);
    } else {
      sets.push(`${field} = $${idx}`);
    }
    idx += 1;
  }

  values.push(eventId);
  const idPlaceholder = `$${idx}`;

  const query = `
    UPDATE tedx_events SET
      ${sets.join(", ")},
      updated_at = NOW()
    WHERE id = ${idPlaceholder}
    RETURNING
      id, slug, name, event_date::text, city, country, event_type, url,
      scraped_at::text, updated_at::text,
      deadline::text, speaker_app_url, website, contact_email,
      facebook, twitter, instagram, linkedin, theme, notes,
      enrichment_status, enriched_at::text
  `;

  try {
    const rows = await sql.query(query, values);
    if (!rows.length) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    return NextResponse.json({ event: rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

