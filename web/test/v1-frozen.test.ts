import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// SHA-256 of v1.0.0:<file>. Hash-pinned so this guard test:
//   1. Catches file-edit drift (local hash diverges from constant).
//   2. Catches tag-rewrite drift (constant won't move with the tag).
//   3. Runs without git available (CI tarball, sandbox, shallow clone).
// To intentionally update v1: bump these constants in the same commit as
// the file change, with a clear "unfreeze" justification.
const PINNED: Record<string, string> = {
  "index.html": "2aa6b1b0db3a1e6aeccc63cb3a2dfef28f90f9ccf5b358179bdf6d6f3e5fb2bf",
  "styles.css":  "d4febfda09cc7c0082490767a58d860dead25b323d573c50f8c21dd52c6db03b",
  "script.js":   "e22b49a299da3186f7c8698a7546ff9de6f09ed8180724d76afc6083d968f990",
};

const here = dirname(fileURLToPath(import.meta.url));
const v1Dir = join(here, "..", "public", "v1");

describe("v1 assets frozen", () => {
  for (const [f, expected] of Object.entries(PINNED)) {
    it(`public/v1/${f} matches pinned sha-256`, () => {
      const buf = readFileSync(join(v1Dir, f));
      const actual = createHash("sha256").update(buf).digest("hex");
      expect(actual).toBe(expected);
    });
  }
});
