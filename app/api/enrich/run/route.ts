import { NextRequest } from "next/server";
import { sql } from "@/lib/db";

export const maxDuration = 300;
export const runtime = "nodejs";

const TEDX_AGENT_URL = process.env.TEDX_AGENT_URL!;
const TEDX_AGENT_TOKEN = process.env.TEDX_AGENT_TOKEN!;

const encoder = new TextEncoder();

export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get("ids") ?? "";
  const ids = idsParam
    .split(",")
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0);

  if (ids.length === 0) {
    return new Response("ids required", { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      for (const id of ids) {
        try {
          // Fetch event from DB
          const rows = await sql`
            SELECT id, name, city, country, event_date::text, url, event_type
            FROM tedx_events
            WHERE id = ${id}
          `;

          if (rows.length === 0) {
            send({ type: "error", id, message: "Event not found" });
            continue;
          }

          const event = rows[0];

          // Mark as running
          await sql`
            UPDATE tedx_events
            SET enrichment_status = 'running'
            WHERE id = ${id}
          `;
          send({ type: "start", id });

          // Call Python agent
          const agentResp = await fetch(`${TEDX_AGENT_URL}/enrich`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${TEDX_AGENT_TOKEN}`,
            },
            body: JSON.stringify({
              name: event.name,
              city: event.city,
              country: event.country,
              event_date: event.event_date,
              url: event.url,
              event_type: event.event_type,
            }),
            signal: AbortSignal.timeout(120_000),
          });

          if (!agentResp.ok) {
            const body = await agentResp.text().catch(() => agentResp.status.toString());
            throw new Error(`Agent error ${agentResp.status}: ${body}`);
          }

          const enriched = await agentResp.json();

          // Update DB and return the full updated row
          const updated = await sql`
            UPDATE tedx_events SET
              deadline          = ${enriched.deadline ?? null}::date,
              speaker_app_url   = ${enriched.speaker_app_url ?? null},
              website           = ${enriched.website ?? null},
              contact_email     = ${enriched.contact_email ?? null},
              facebook          = ${enriched.facebook ?? null},
              twitter           = ${enriched.twitter ?? null},
              instagram         = ${enriched.instagram ?? null},
              linkedin          = ${enriched.linkedin ?? null},
              theme             = ${enriched.theme ?? null},
              notes             = ${enriched.notes ?? null},
              enrichment_status = 'done',
              enriched_at       = NOW()
            WHERE id = ${id}
            RETURNING
              id, slug, name, event_date::text, city, country, event_type, url,
              scraped_at::text, updated_at::text,
              deadline::text, speaker_app_url, website, contact_email,
              facebook, twitter, instagram, linkedin, theme, notes,
              enrichment_status, enriched_at::text
          `;

          send({ type: "result", id, event: updated[0] });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          await sql`
            UPDATE tedx_events SET enrichment_status = 'failed' WHERE id = ${id}
          `.catch(() => {});
          send({ type: "error", id, message });
        }
      }

      send({ type: "done" });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
