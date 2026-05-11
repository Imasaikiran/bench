import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { createHash } from "node:crypto";
import { sql } from "../../../lib/db";
import { payloadSchema, CURRENT_SCHEMA, SUPPORTED_SCHEMAS } from "../../../lib/schema";
import { verifyClientHmac } from "../../../lib/hmac";
import { reScoreFromCounts } from "../../../lib/rubric";
import { detectAnomalies } from "../../../lib/anomaly";
import { rateLimitOk, hashIp } from "../../../lib/ratelimit";
import { captureException } from "../../../lib/sentry-capture";
import { trackServerSide } from "../../../lib/plausible";

export const runtime = "nodejs"; // need node:crypto + filesystem (rubric.yaml load)

const MAX_BODY = 16 * 1024;

export async function POST(req: NextRequest): Promise<Response> {
  // Task 1.35: when env OVER_CAPACITY=1, refuse with 503 + redirect hint.
  if (process.env["OVER_CAPACITY"] === "1") {
    return NextResponse.json(
      { error: "over capacity", retry_after: "few hours", url: "/over-capacity" },
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

  // Schema-version gate BEFORE zod (so old clients get a clean 426 instead of zod errors).
  const sv = (body as { schema_version?: unknown })?.schema_version;
  if (typeof sv !== "string" || !acceptSchema(sv)) {
    return NextResponse.json(
      { error: "stale client", required_version: CURRENT_SCHEMA },
      { status: 426 },
    );
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  if (!verifyClientHmac(parsed.data)) {
    return NextResponse.json({ error: "integrity mismatch" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ipHash = hashIp(ip);
  const rl = await rateLimitOk(ipHash);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const rescored = reScoreFromCounts(parsed.data.counts);
  const anomalies = detectAnomalies(parsed.data, rescored);
  const isSuspect = anomalies.length > 0;

  const id = nanoid(10);
  const hash = createHash("sha256").update(raw).digest("hex");
  const stored = {
    ...parsed.data,
    score: rescored.score,
    tier: rescored.tier,
    chapters: rescored.chapters,
  };

  try {
    await sql`
      INSERT INTO scans (id, payload, payload_hash, ip_hash, user_agent, rubric_version, is_suspect, suspect_reason, created_at, expires_at)
      VALUES (
        ${id},
        ${JSON.stringify(stored)}::jsonb,
        ${hash},
        ${ipHash},
        ${req.headers.get("user-agent") ?? ""},
        ${rescored.rubricVersion},
        ${isSuspect},
        ${anomalies.join(";") || null},
        NOW(),
        NOW() + INTERVAL '30 days'
      )
    `;
  } catch (err) {
    captureException(err, { route: "/api/scan", scan_id: id });
    console.error(`scan insert failed for id=${id}:`, err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "storage unavailable" },
      { status: 503, headers: { "Retry-After": "60" } },
    );
  }

  void trackServerSide("scan_upload");

  // Use NextRequest.nextUrl when available (production); fall back to the
  // standard URL API for test environments that use plain Request.
  const origin =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as unknown as { nextUrl?: { origin: string } }).nextUrl?.origin ??
    new URL(req.url).origin;

  return NextResponse.json({
    id,
    url: `${origin}/scan/${id}`,
    is_suspect: isSuspect,
    score: rescored.score,
  });
}

function acceptSchema(v: string): boolean {
  return (SUPPORTED_SCHEMAS as readonly string[]).includes(v);
}
