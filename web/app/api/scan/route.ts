import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { createHash } from "node:crypto";
import { sql } from "../../../lib/db";
import { payloadSchema, CURRENT_SCHEMA, MIN_SCHEMA } from "../../../lib/schema";
import { verifyClientHmac } from "../../../lib/hmac";
import { reScoreFromCounts } from "../../../lib/rubric";
import { detectAnomalies } from "../../../lib/anomaly";
import { rateLimitOk, hashIp } from "../../../lib/ratelimit";

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

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ipHash = hashIp(ip);
  if (!(await rateLimitOk(ipHash))) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
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

  return NextResponse.json({
    id,
    url: `https://bench.dev/scan/${id}`,
    is_suspect: isSuspect,
    score: rescored.score,
  });
}

function acceptSchema(v: string): boolean {
  return v === CURRENT_SCHEMA || v === MIN_SCHEMA;
}
