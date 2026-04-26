import { createHash } from "node:crypto";
import { sql } from "./db";

// Daily salt rotates every UTC day so ip_hash is unrecoverable across days.
// Using the YYYY-MM-DD UTC slice means the salt and the window-start are both
// day-aligned: a single client gets exactly one rate_limits row per UTC day.
function dailySalt(): string {
  const day = new Date().toISOString().slice(0, 10);
  return `bench-rl-${day}`;
}

// Returns a 32-char hex string per §1.33 spec.
export function hashIp(ip: string): string {
  return createHash("sha256").update(ip + dailySalt()).digest("hex").slice(0, 32);
}

// §1.33: 50 requests per IP per UTC-midnight aligned 24h window (was 30/hour rolling).
const MAX_REQUESTS = 50;

export type RateLimitResult = { ok: boolean; retryAfterSec: number };

export async function rateLimitOk(ipHash: string): Promise<RateLimitResult> {
  const now = new Date();

  // UTC-midnight aligned window: floor to start of current UTC day, end at next midnight.
  // This replaces the previous 1h rolling window with a fixed 24h boundary.
  const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const windowEnd = new Date(windowStart.getTime() + 24 * 60 * 60 * 1000);

  const rows = (await sql`
    INSERT INTO rate_limits (ip_hash, window_start, request_count)
    VALUES (${ipHash}, ${windowStart.toISOString()}, 1)
    ON CONFLICT (ip_hash, window_start)
    DO UPDATE SET request_count = rate_limits.request_count + 1
    RETURNING request_count
  `) as Array<{ request_count: number }>;

  const count = rows[0]?.request_count ?? 1;
  // Seconds remaining until next UTC midnight (i.e. when the current window expires).
  const retryAfterSec = Math.max(1, Math.ceil((windowEnd.getTime() - now.getTime()) / 1000));
  return { ok: count <= MAX_REQUESTS, retryAfterSec };
}
