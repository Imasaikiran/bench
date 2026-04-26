import { createHash } from "node:crypto";
import { sql } from "./db";

// Daily salt rotates every 24h so ip_hash is unrecoverable across days.
function dailySalt(): string {
  const day = new Date().toISOString().slice(0, 10);
  return `bench-rl-${day}`;
}

export function hashIp(ip: string): string {
  return createHash("sha256").update(ip + dailySalt()).digest("hex");
}

const WINDOW_MS = 60 * 60 * 1000; // 1h
const MAX_REQUESTS = 30; // 30 scans per IP per hour

export async function rateLimitOk(ipHash: string): Promise<boolean> {
  const windowStart = new Date(
    Math.floor(Date.now() / WINDOW_MS) * WINDOW_MS,
  ).toISOString();
  // Upsert + count. Postgres ON CONFLICT path increments.
  const rows = (await sql`
    INSERT INTO rate_limits (ip_hash, window_start, request_count)
    VALUES (${ipHash}, ${windowStart}, 1)
    ON CONFLICT (ip_hash, window_start)
    DO UPDATE SET request_count = rate_limits.request_count + 1
    RETURNING request_count
  `) as Array<{ request_count: number }>;
  const count = rows[0]?.request_count ?? 1;
  return count <= MAX_REQUESTS;
}
