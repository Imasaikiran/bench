import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

describe("v1 assets frozen", () => {
  for (const f of ["index.html","styles.css","script.js"]) {
    it(`public/v1/${f} matches tag v1.0.0:${f}`, () => {
      const local = readFileSync(`public/v1/${f}`);
      const ref = execSync(`git show v1.0.0:${f}`);
      expect(local.equals(ref)).toBe(true);
    });
  }
});
