import { neon } from "@neondatabase/serverless";

if (!process.env["DATABASE_URL"]) {
  // Module is imported by API routes; throwing here gives a clean error surface
  // instead of an opaque neon failure on first query.
  throw new Error("DATABASE_URL not set — required for /api/scan and friends");
}

export const sql = neon(process.env["DATABASE_URL"]);
