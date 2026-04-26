import { NextRequest, NextResponse } from "next/server";
import { sql } from "../../../../lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<Response> {
  // Bearer-token gate: Vercel cron sends Authorization: Bearer <CRON_SECRET>.
  const expected = `Bearer ${process.env["CRON_SECRET"] ?? ""}`;
  const got = req.headers.get("authorization") ?? "";
  if (!process.env["CRON_SECRET"] || got !== expected) {
    return new Response("forbidden", { status: 403 });
  }

  try {
    const rows = (await sql`
      DELETE FROM scans
      WHERE expires_at IS NOT NULL AND expires_at < NOW()
      RETURNING id
    `) as Array<{ id: string }>;
    return NextResponse.json({ deleted: rows.length });
  } catch (err) {
    console.error("cron expire failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "storage unavailable" }, { status: 503 });
  }
}
