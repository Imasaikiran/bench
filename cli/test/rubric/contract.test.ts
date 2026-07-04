/**
 * Scorer-scanner contract guard (Batch 1, fix 3).
 *
 * The bug class this test kills: a predicate in score.ts starts reading a
 * counts field the scanner never emits. That field is always `undefined`,
 * so `num()`/`bool()` treat it as NaN/false forever, and the dimension
 * silently scores missing or partial for every single user with no error
 * anywhere. This happened three times already (settings_valid,
 * docs_dir_nonempty, clean_frontmatter_ratio) before this test existed.
 *
 * The guard: run a real scan() against a fixture, then assert every field
 * name in REQUIRED_COUNT_FIELDS (score.ts's own list of what its predicates
 * read) is present as a key in the scanner's emitted counts object. If a
 * predicate is later added or edited to read a new field, REQUIRED_COUNT_FIELDS
 * must grow with it (see the comment at its definition) — if the scanner
 * doesn't also start emitting that key, this test fails.
 */

import { describe, it, expect } from "vitest";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { scan } from "../../src/scanner";
import { REQUIRED_COUNT_FIELDS } from "../../src/rubric/score";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");

describe("scorer-scanner contract", () => {
  it("every field a predicate reads is emitted by a real scan()", async () => {
    const { counts } = await scan(join(fixturesDir, "conductor"), { git: false });
    const missing = REQUIRED_COUNT_FIELDS.filter((field) => !(field in counts));
    expect(missing).toEqual([]);
  });

  it("REQUIRED_COUNT_FIELDS itself has no duplicate entries", () => {
    expect(new Set(REQUIRED_COUNT_FIELDS).size).toBe(REQUIRED_COUNT_FIELDS.length);
  });
});
