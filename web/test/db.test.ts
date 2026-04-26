import { describe, it, expect } from "vitest";

const HAS_DB = !!process.env["DATABASE_URL"];

describe.skipIf(!HAS_DB)("db (integration)", () => {
  it("connects and counts scans", async () => {
    // Lazy-import so the module-load throw in lib/db doesn't crash CI without DATABASE_URL.
    const { sql } = await import("../lib/db");
    const rows = (await sql`SELECT COUNT(*)::int AS n FROM scans`) as Array<{ n: number }>;
    expect(rows).toHaveLength(1);
    expect(typeof rows[0]?.n).toBe("number");
  });
});
