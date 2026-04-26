import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { sql } from "../../../lib/db";
import { verifySession } from "../../../lib/github";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<Response> {
  // ---------------------------------------------------------------------------
  // Auth gate — read cookie from NextRequest.cookies (production) or the raw
  // Cookie header (plain Request in test environments).
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Look up profile by github_id. DO NOT trust any body parameter — the session
  // cookie is the only identifier. Callers cannot choose which profile to delete.
  // ---------------------------------------------------------------------------
  const profile = (await sql`
    SELECT handle, latest_scan FROM profiles WHERE github_id = ${session.github_id} LIMIT 1
  `) as Array<{ handle: string; latest_scan: string | null }>;

  if (profile.length === 0) {
    return NextResponse.json({ error: "no profile" }, { status: 404 });
  }

  const handle = profile[0]!.handle;
  const latestScan = profile[0]!.latest_scan;

  // ---------------------------------------------------------------------------
  // Delete in a single transaction:
  //   1. DELETE the latest_scan row (if present).
  //   2. DELETE the profile row.
  //
  // Cascades handled by DB schema:
  //   - feedback.scan_id ON DELETE CASCADE → feedback rows auto-cleaned.
  //   - profiles.latest_scan ON DELETE SET NULL → FK is NULLed before profile
  //     delete, so the profile DELETE does not fail on the FK constraint.
  //
  // Note on historical scans: scans has no profile_id column; the only link is
  // profiles.latest_scan → scans.id. Prior scans reachable via previous_scan_id
  // chains are anonymous after the profile is removed and will be expired by the
  // cron job. This is intentional for phase-1 scope.
  // ---------------------------------------------------------------------------
  try {
    const queries = [];
    if (latestScan) {
      queries.push(sql`DELETE FROM scans WHERE id = ${latestScan}`);
    }
    queries.push(sql`DELETE FROM profiles WHERE handle = ${handle}`);
    await sql.transaction(queries);
  } catch (err) {
    console.error("delete failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "storage unavailable" }, { status: 503 });
  }

  // ---------------------------------------------------------------------------
  // Cache eviction — revalidatePath is best-effort; failures must not block
  // the response since the data is already gone from the DB.
  // ---------------------------------------------------------------------------
  try {
    revalidatePath(`/u/${handle}`);
    revalidatePath(`/api/og/${handle}`);
    if (latestScan) {
      revalidatePath(`/scan/${latestScan}`);
      revalidatePath(`/api/og/${latestScan}`);
    }
  } catch (err) {
    // Non-fatal — log but proceed.
    console.error("revalidate failed:", err instanceof Error ? err.message : err);
  }

  const res = NextResponse.json({
    ok: true,
    deleted: { scans: latestScan ? 1 : 0, handle },
  });

  // Clear the session cookie.
  res.cookies.set("bench_session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env["NODE_ENV"] === "production",
    maxAge: 0,
    path: "/",
  });

  return res;
}
