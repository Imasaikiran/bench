import { describe, it, expect } from "vitest";
import Ajv from "ajv";
import { readFileSync } from "node:fs";
import { load } from "js-yaml";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(here, "..", "schema.json");
const rubricPath = resolve(here, "..", "rubric.yaml");

const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
const rubric = load(readFileSync(rubricPath, "utf8")) as {
  version: string;
  tiers: Array<{ name: string; conditions: string[] }>;
  chapters: Record<
    string,
    { slot_labels: string[]; dimensions: Array<{ id: number; name: string; weight: number; rationale: string }> }
  >;
};

describe("rubric.yaml", () => {
  it("validates against schema.json", () => {
    const ajv = new Ajv({ allErrors: true });
    const validate = ajv.compile(schema);
    const ok = validate(rubric);
    if (!ok) {
      // Surface all errors for easy debugging
      console.error(JSON.stringify(validate.errors, null, 2));
    }
    expect(validate.errors).toBeNull();
    expect(ok).toBe(true);
  });

  it("has exactly 25 dimensions across 5 chapters of 5 each", () => {
    const chapterNames = ["Foundation", "Automation", "Delegation", "Craft", "Coherence"];
    for (const name of chapterNames) {
      const ch = rubric.chapters[name];
      expect(ch).toBeDefined();
      if (ch === undefined) continue;
      expect(ch.dimensions).toHaveLength(5);
    }
    const allIds = chapterNames.flatMap((n) => {
      const ch = rubric.chapters[n];
      if (ch === undefined) return [];
      return ch.dimensions.map((d) => d.id);
    });
    expect(allIds).toHaveLength(25);
    expect(new Set(allIds).size).toBe(25); // no duplicate ids
    expect([...allIds].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 25 }, (_, i) => i + 1)
    );
  });

  it("version is semver", () => {
    expect(rubric.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("has all five tiers", () => {
    const names = rubric.tiers.map((t) => t.name).sort();
    expect(names).toEqual(["Conductor", "Craftsman", "Explorer", "Operator", "Tinkerer"]);
  });

  it("every dimension has a non-empty rationale", () => {
    for (const ch of Object.values(rubric.chapters)) {
      for (const d of ch.dimensions) {
        expect(d.rationale.length).toBeGreaterThan(10);
      }
    }
  });
});
