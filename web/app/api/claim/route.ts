import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "../../../lib/db";
import { verifySession } from "../../../lib/github";

export const runtime = "nodejs";

const bodySchema = z.object({ scan_id: z.string().min(1).max(64) });

export async function POST(req: NextRequest): Promise<Response> {
  // -------------------------------------------------------------------------
  // Auth gate
  // Parse the bench_session cookie value from either the NextRequest `.cookies`
  // API (production) or the raw Cookie header (test environment uses plain Request).
  // -------------------------------------------------------------------------
  const cookieHeader = req.headers.get("cookie") ?? "";
  const cookieValue =
    // NextRequest exposes req.cookies; plain Request does not.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as unknown as { cookies?: { get(name: string): { value: string } | undefined } }).cookies?.get("bench_session")?.value ??
    cookieHeader
      .split(";")
      .map((p) => p.trim())
      .find((p) => p.startsWith("bench_session="))
      ?.slice("bench_session=".length);
  const session = verifySession(cookieValue);
  if (!session) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  // -------------------------------------------------------------------------
  // Body validation
  // -------------------------------------------------------------------------
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const handle = session.login.toLowerCase();
  const githubId = session.github_id;

  // -------------------------------------------------------------------------
  // Handle collision check: is this handle PK owned by a different github_id?
  // -------------------------------------------------------------------------
  const existing = (await sql`
    SELECT github_id FROM profiles WHERE handle = ${handle}
  `) as Array<{ github_id: number }>;

  if (existing.length > 0 && existing[0]?.github_id !== githubId) {
    return NextResponse.json(
      { error: "handle taken by another github account" },
      { status: 409 },
    );
  }

  // -------------------------------------------------------------------------
  // Upsert profile and mark scan as permanent (expires_at = NULL)
  // -------------------------------------------------------------------------
  try {
    await sql`
      INSERT INTO profiles (handle, github_id, latest_scan)
      VALUES (${handle}, ${githubId}, ${parsed.data.scan_id})
      ON CONFLICT (github_id) DO UPDATE SET
        latest_scan = EXCLUDED.latest_scan,
        updated_at  = NOW()
    `;
    await sql`
      UPDATE scans SET expires_at = NULL WHERE id = ${parsed.data.scan_id}
    `;
  } catch (err) {
    console.error(
      "claim insert failed:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: "storage unavailable" }, { status: 503 });
  }

  // Use NextRequest.nextUrl when available (production); fall back to the
  // standard URL API for the test environment (plain Request).
  const origin =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as unknown as { nextUrl?: { origin: string } }).nextUrl?.origin ??
    new URL(req.url).origin;
  return NextResponse.redirect(`${origin}/u/${handle}`);
}
