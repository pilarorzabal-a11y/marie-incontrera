import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { ids } = await req.json() as { ids: number[] };

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids required" }, { status: 400 });
  }

  // Only queue events that haven't been enriched or failed (not pending/running/done)
  await sql`
    UPDATE tedx_events
    SET enrichment_status = 'pending'
    WHERE id = ANY(${ids}::int[])
      AND (enrichment_status IS NULL OR enrichment_status = 'failed')
  `;

  return NextResponse.json({ queued: ids.length });
}
