/**
 * Task 1.37 — End-to-end CLI → web → DB wiring test.
 *
 * MANUAL PREREQS (must all be satisfied before setting BENCH_E2E=1):
 *   1. Web server running:  pnpm -C web dev   (or set BENCH_URL)
 *   2. DATABASE_URL wired into the web process.
 *   3. CLI built:           pnpm -C cli build  (produces cli/dist/index.js)
 *
 * Skipped by default (BENCH_E2E !== "1").  Do NOT add this gate to CI without a
 * real database — the test exercises the live /api/scan route and persists a row.
 *
 * Strategy
 * --------
 * Rather than driving the interactive consent prompt, we invoke the CLI in
 * --offline mode against the tinkerer fixture.  The CLI writes bench-scan.json
 * to cwd.  We then POST that JSON to /api/scan directly, which is the same wire
 * format the interactive upload path uses.  This validates:
 *   - CLI produces a well-formed payload (schema_version, client_hmac)
 *   - /api/scan accepts the payload and returns {id, url}
 *   - /scan/<id> renders an HTML page that contains the root mount point
 */

import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";

const here = dirname(fileURLToPath(import.meta.url));
const cliBin = resolve(here, "..", "dist", "index.js");

// CLAUDE_HOME is the env var that bench reads (see cli/src/env.ts).
// The tinkerer fixture IS the .claude directory (contains settings.json,
// CLAUDE.md, projects/, skills/) — pass it directly as CLAUDE_HOME.
const fixtureClaudeHome = resolve(here, "fixtures", "tinkerer");

const RUN = process.env["BENCH_E2E"] === "1";
const baseUrl = process.env["BENCH_URL"] ?? "http://localhost:3000";

// CI env vars that bench's refuseIfUnsafe() blocks on.
const CI_VARS = [
  "CI",
  "GITHUB_ACTIONS",
  "GITLAB_CI",
  "CIRCLECI",
  "BUILDKITE",
  "TRAVIS",
  "JENKINS_URL",
] as const;

describe.skipIf(!RUN)("e2e: CLI -> web -> DB", () => {
  it(
    "spawns CLI against tinkerer fixture, hits /api/scan, gets id back",
    async () => {
      // 1. Confirm web server is reachable.
      const probe = await fetch(baseUrl).catch(() => null);
      if (!probe) {
        throw new Error(
          `web server not reachable at ${baseUrl} — start with 'pnpm -C web dev'`,
        );
      }

      // 2. Create a temp dir for the CLI to write bench-scan.json into.
      //    Use a path inside the cli package so it's easy to find / clean up.
      const tempDir = resolve(here, "..", ".e2e-tmp");
      mkdirSync(tempDir, { recursive: true });

      // Strip CI env vars so bench's refuseIfUnsafe() does not reject.
      const childEnv: NodeJS.ProcessEnv = { ...process.env };
      for (const key of CI_VARS) {
        delete childEnv[key];
      }

      // 3. Run CLI in --offline mode against the tinkerer fixture.
      //    CLAUDE_HOME overrides the default os.homedir()/.claude path (env.ts:32).
      //    cwd=tempDir means bench-scan.json is written there.
      const proc = spawnSync(
        process.execPath, // node binary
        [cliBin, "--offline"],
        {
          env: {
            ...childEnv,
            CLAUDE_HOME: fixtureClaudeHome,
            BENCH_RUBRIC: resolve(here, "..", "rubric.yaml"),
          },
          cwd: tempDir,
          encoding: "utf8",
        },
      );

      expect(proc.status, `CLI stderr:\n${proc.stderr}`).toBe(0);

      // 4. Parse the emitted payload.
      const payloadJson = await readFile(
        resolve(tempDir, "bench-scan.json"),
        "utf8",
      );
      const payload = JSON.parse(payloadJson) as Record<string, unknown>;

      expect(payload["schema_version"]).toBe("1.0");
      expect(
        (payload["integrity"] as Record<string, unknown>)["client_hmac"],
      ).toMatch(/^[a-f0-9]{64}$/);

      // 5. POST the payload to /api/scan.
      const res = await fetch(`${baseUrl}/api/scan`, {
        method: "POST",
        body: payloadJson,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "bench-e2e/1.0",
        },
      });

      expect(res.status).toBe(200);
      const j = (await res.json()) as Record<string, unknown>;
      expect(j["id"]).toMatch(/^[a-zA-Z0-9_-]{10}$/);
      expect(j["url"]).toMatch(
        new RegExp(`^https://[^/]+/scan/${j["id"] as string}$`),
      );

      // 6. Verify the scan page renders (smoke for the Next.js page route).
      const page = await fetch(`${baseUrl}/scan/${j["id"] as string}`);
      expect(page.status).toBe(200);
      const html = await page.text();
      expect(html).toContain("bench-root");

      // 7. Clean up temp dir (best-effort; don't fail the test if it errors).
      await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    },
    // Allow up to 60 s: CLI scans the fixture + git ops + network round-trips.
    60_000,
  );
});
