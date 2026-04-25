import { describe, it, expect } from "vitest";
import { statSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Absolute path so the test survives a future runner that doesn't cwd into cli/.
const fixRoot = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

describe("fixture directories", () => {
  const required = ["explorer", "tinkerer", "craftsman", "operator", "conductor"];
  for (const f of required) {
    it(`${f} exists with README`, () => {
      expect(statSync(join(fixRoot, f)).isDirectory()).toBe(true);
      const readme = readFileSync(join(fixRoot, f, "README.md"), "utf8");
      expect(readme).toMatch(/expected tier:\s*\w+/i);
    });
  }
});
