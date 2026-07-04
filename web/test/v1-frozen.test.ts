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
//
// Unfreeze (Task R1, plain-language copy sweep): index.html, script.js, and
// styles.css bumped to remove em dashes from user-visible persona/meaning
// copy and a comment header (founder no-em-dash rule). No structural/markup
// changes; local-export.ts anchors (PERSONAS decl, currentPersona,
// applyPersona, persona-switcher aside, synthetic-preview footer marker)
// verified byte-intact via local-export tests.
const PINNED: Record<string, string> = {
  "index.html": "e0de024fbbf4854890e13fd6e54fefa1866592dd49989e0a5d6ee5ceb937579c",
  "styles.css":  "6f308b13a1bd4f2704e8c211562b53c34069e4c5ba9c35e69c6fa45229342691",
  "script.js":   "ca47ac5341e9b56284b4447be844c0e3b94cd914ab03fc4024a962f87457cd22",
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
