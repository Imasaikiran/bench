/**
 * CI-pinned snapshot tests for all 5 tier fixtures (Task 1.20, §10.1 #7).
 *
 * For each tier, scan() is called, then scoreFromCounts() is applied.
 * The result { rubric_version, counts, chapters, score } is compared to a
 * pinned JSON snapshot file in test/snapshots/.
 *
 * To regenerate snapshots after a deliberate change:
 *   UPDATE_SNAPSHOTS=1 pnpm test
 *
 * Snapshots include rubric_version so any rubric.yaml edit forces
 * regeneration. Diagnostics are excluded (non-deterministic parseWarnings
 * + elapsed_ms). git: false is passed to scan() for deterministic output.
 *
 * Paths are anchored via fileURLToPath so tests survive a runner that
 * doesn't cwd into cli/ (matches scanner/index.test.ts convention).
 */

import { describe, it, expect } from "vitest";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { scan } from "../src/scanner";
import { loadRubric } from "../src/rubric/load";
import { scoreFromCounts } from "../src/rubric/score";

// Absolute paths — survive any runner cwd.
const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(here, "fixtures");
const snapshotsDir = join(here, "snapshots");
// rubric.yaml is bundled by `pnpm copy:rubric` (pretest hook already runs this).
const rubricPath = join(here, "..", "rubric.yaml");

const UPDATE = process.env["UPDATE_SNAPSHOTS"] === "1";

const TIERS = ["explorer", "tinkerer", "craftsman", "operator", "conductor"] as const;
type Tier = (typeof TIERS)[number];

interface SnapshotData {
  rubric_version: string;
  counts: Record<string, unknown>;
  chapters: Record<string, { score: number; states: string[] }>;
  score: number;
}

describe("tier fixture snapshots", () => {
  const rubric = loadRubric(rubricPath);

  for (const name of TIERS) {
    it(`${name} snapshot matches`, async () => {
      const fixturePath = join(fixturesDir, name);
      const snapshotPath = join(snapshotsDir, `${name}.json`);

      // Scan the fixture; git: false for deterministic output.
      const { counts } = await scan(fixturePath, { git: false });

      // Score it.
      const { chapters, score } = scoreFromCounts(counts, rubric);

      // Build snapshot data — exclude diagnostics (non-deterministic).
      // Sort top-level keys for diff sanity in git.
      const actual: SnapshotData = {
        chapters,
        counts,
        rubric_version: rubric.version,
        score,
      };

      if (UPDATE) {
        // Regenerate: write sorted JSON snapshot.
        writeFileSync(snapshotPath, JSON.stringify(actual, null, 2) + "\n", "utf8");
        // Pass trivially when regenerating.
        expect(true).toBe(true);
        return;
      }

      // Verify snapshot file exists.
      if (!existsSync(snapshotPath)) {
        throw new Error(
          `Snapshot file missing for "${name}": ${snapshotPath}\n` +
            `Run UPDATE_SNAPSHOTS=1 pnpm test to generate it.`,
        );
      }

      const stored = JSON.parse(readFileSync(snapshotPath, "utf8")) as SnapshotData;

      // snapshot drift for ${name}; run UPDATE_SNAPSHOTS=1 pnpm test to
      // regenerate after reviewing the diff.
      expect(actual).toEqual(stored);
    });
  }
});
