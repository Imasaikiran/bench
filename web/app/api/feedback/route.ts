import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "../../../lib/db";

export const runtime = "nodejs";

const MAX_BODY = 4 * 1024;

const feedbackSchema = z.object({
  scan_id: z.string().min(1).max(64),
  dimension: z.union([z.string().max(64), z.null()]).optional(),
  reason: z.string().min(1).max(2000),
});

export async function POST(req: NextRequest): Promise<Response> {
  if (process.env["OVER_CAPACITY"] === "1") {
    return NextResponse.json(
      { error: "over capacity" },
      { status: 503, headers: { "Retry-After": "3600" } },
    );
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  // Verify scan exists (enforces FK at the API boundary so we return 404 not a Postgres error).
  const found = (await sql`SELECT id FROM scans WHERE id = ${parsed.data.scan_id} LIMIT 1`) as Array<{ id: string }>;
  if (found.length === 0) {
    return NextResponse.json({ error: "scan not found" }, { status: 404 });
  }

  try {
    const rows = (await sql`
      INSERT INTO feedback (scan_id, dimension, reason)
      VALUES (${parsed.data.scan_id}, ${parsed.data.dimension ?? null}, ${parsed.data.reason})
      RETURNING id
    `) as Array<{ id: number | string }>;
    return NextResponse.json({ ok: true, id: rows[0]?.id ?? null });
  } catch (err) {
    console.error(`feedback insert failed for scan_id=${parsed.data.scan_id}:`, err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "storage unavailable" }, { status: 503 });
  }
}
