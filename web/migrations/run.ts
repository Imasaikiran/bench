import { readdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

// Expected invocation: cd web && pnpm migrate
// Using import.meta.url-relative resolution so cwd doesn't matter.
const migrationsDir = dirname(fileURLToPath(import.meta.url));

if (!process.env["DATABASE_URL"]) {
  console.error(
    "DATABASE_URL not set — required for 'pnpm migrate'. Set it in web/.env.local or export it inline.",
  );
  process.exit(1);
}

const sql = neon(process.env["DATABASE_URL"]);

await sql`CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT NOW())`;
const appliedRows = (await sql`SELECT id FROM _migrations`) as Array<{ id: string }>;
const applied = new Set(appliedRows.map((r) => r.id));

for (const f of readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort()) {
  if (applied.has(f)) continue;
  const text = readFileSync(`${migrationsDir}/${f}`, "utf8");
  // Naive split: single-line `;`-terminated statements only. No functions,
  // triggers, DO blocks, or `$$ ... $$` dollar-quoted bodies (would be
  // sliced in half). Fine for our hand-authored DDL files.
  const stmts = text.split(/;\s*$/m).filter((s) => s.trim());
  try {
    for (const stmt of stmts) {
      // neon's tagged-template typing rejects bare-string calls; use the escape hatch.
      await (sql as unknown as (q: string) => Promise<unknown>)(stmt);
    }
    await sql`INSERT INTO _migrations (id) VALUES (${f})`;
    console.log(`applied ${f}`);
  } catch (err) {
    console.error(`migration failed: ${f}`);
    throw err;
  }
}
