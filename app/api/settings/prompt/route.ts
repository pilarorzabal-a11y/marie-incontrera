import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const TEDX_AGENT_URL = process.env.TEDX_AGENT_URL!;
const TEDX_AGENT_TOKEN = process.env.TEDX_AGENT_TOKEN!;

export async function GET() {
  try {
    const resp = await fetch(`${TEDX_AGENT_URL}/settings/prompt`, {
      headers: { Authorization: `Bearer ${TEDX_AGENT_TOKEN}` },
      signal: AbortSignal.timeout(20_000),
    });

    const body = await resp.text();
    if (!resp.ok) {
      return NextResponse.json(
        { error: `Agent error ${resp.status}: ${body}` },
        { status: resp.status },
      );
    }

    return new NextResponse(body, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const payload = await req.json();
    const prompt = typeof payload?.prompt === "string" ? payload.prompt : "";
    if (!prompt.trim()) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const resp = await fetch(`${TEDX_AGENT_URL}/settings/prompt`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TEDX_AGENT_TOKEN}`,
      },
      body: JSON.stringify({ prompt }),
      signal: AbortSignal.timeout(20_000),
    });

    const body = await resp.text();
    if (!resp.ok) {
      return NextResponse.json(
        { error: `Agent error ${resp.status}: ${body}` },
        { status: resp.status },
      );
    }

    return new NextResponse(body, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

