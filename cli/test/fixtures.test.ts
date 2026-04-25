import { describe, it, expect } from "vitest";
import { statSync, readFileSync } from "node:fs";
import { join } from "node:path";

describe("fixture directories", () => {
  const fixRoot = "test/fixtures";
  const required = ["explorer", "tinkerer", "craftsman", "operator", "conductor"];
  for (const f of required) {
    it(`${f} exists with README`, () => {
      expect(statSync(join(fixRoot, f)).isDirectory()).toBe(true);
      const readme = readFileSync(join(fixRoot, f, "README.md"), "utf8");
      expect(readme).toMatch(/expected tier:\s*\w+/i);
    });
  }
});
