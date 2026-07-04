import { describe, it, expect } from "vitest";
import { pickHeadlineRarity, MIN_DENOMINATOR, RARITY_CEILING_PCT } from "../../src/rubric/prevalence";
import type { PrevalenceTable } from "../../src/rubric/prevalence";

const NAMES = new Map<number, string>([
  [1, "Root CLAUDE.md"],
  [7, "PreToolUse hook"],
  [11, "skills (>=3)"],
  [18, "worktrees"],
]);

const TABLE: PrevalenceTable = {
  denominator: 50,
  denominator_label: "public setups benchmarked",
  dimensions: {
    "1": 45, // 90% — common, not notable
    "7": 4, // 8% — rare
    "11": 10, // 20% — rare
    "18": 13, // 26% — just above ceiling
  },
};

describe("pickHeadlineRarity", () => {
  it("returns the rarest qualifying dimension the user has, with rounded percent and denominator", () => {
    const out = pickHeadlineRarity([7, 11], NAMES, TABLE);
    expect(out).toBe(
      "Only 8% of 50 public setups benchmarked have a PreToolUse hook. You do.",
    );
  });

  it("picks the lowest count/denominator among multiple qualifying haves", () => {
    // dim 11 is 20%, dim 7 is 8% — 7 should win even though 11 comes later in array order
    const out = pickHeadlineRarity([11, 7], NAMES, TABLE);
    expect(out).toMatch(/PreToolUse hook/);
  });

  it("ties break on lower dimension id (determinism)", () => {
    const tiedTable: PrevalenceTable = {
      denominator: 50,
      denominator_label: "public setups benchmarked",
      dimensions: { "7": 5, "11": 5 },
    };
    const out = pickHeadlineRarity([11, 7], NAMES, tiedTable);
    expect(out).toMatch(/PreToolUse hook/); // id 7 < id 11
  });

  it("never displays 0%, floors at 1%", () => {
    const tinyTable: PrevalenceTable = {
      denominator: 10000,
      denominator_label: "public setups benchmarked",
      dimensions: { "7": 1 }, // 0.01% rounds to 0, must floor to 1
    };
    const out = pickHeadlineRarity([7], NAMES, tinyTable);
    expect(out).toMatch(/Only 1% of/);
  });

  it("rounds percentage to nearest integer", () => {
    const table: PrevalenceTable = {
      denominator: 30,
      denominator_label: "public setups benchmarked",
      dimensions: { "7": 2 }, // 6.66...% rounds to 7%
    };
    const out = pickHeadlineRarity([7], NAMES, table);
    expect(out).toMatch(/Only 7% of/);
  });

  it("copy ends with 'You do.' and has no em dash", () => {
    const out = pickHeadlineRarity([7], NAMES, TABLE);
    expect(out).toMatch(/You do\.$/);
    expect(out).not.toMatch(/—/);
    expect(out).not.toMatch(/–/);
  });

  it("references the dimension by human name, not raw id", () => {
    const out = pickHeadlineRarity([7], NAMES, TABLE);
    expect(out).not.toMatch(/#7\b/);
    expect(out).toMatch(/PreToolUse hook/);
  });

  it("only surfaces when percentage <= RARITY_CEILING_PCT (25%)", () => {
    // dim 11 is exactly 20%, should qualify
    const out = pickHeadlineRarity([11], NAMES, TABLE);
    expect(out).toMatch(/skills \(>=3\)/);
  });

  it("boundary: exactly 25% qualifies", () => {
    const table: PrevalenceTable = {
      denominator: 100,
      denominator_label: "public setups benchmarked",
      dimensions: { "7": 25 },
    };
    const out = pickHeadlineRarity([7], NAMES, table);
    expect(out).toMatch(/Only 25% of/);
  });

  it("boundary: just above 25% (26%) does not qualify", () => {
    const out = pickHeadlineRarity([18], NAMES, TABLE);
    expect(out).toBeNull();
  });

  it("RARITY_CEILING_PCT constant is 25", () => {
    expect(RARITY_CEILING_PCT).toBe(25);
  });

  it("MIN_DENOMINATOR constant is 20", () => {
    expect(MIN_DENOMINATOR).toBe(20);
  });

  it("returns null when table is empty (unpopulated seed)", () => {
    const empty: PrevalenceTable = {
      denominator: 0,
      denominator_label: "public setups benchmarked",
      dimensions: {},
    };
    const out = pickHeadlineRarity([7, 11], NAMES, empty);
    expect(out).toBeNull();
  });

  it("returns null when denominator is below MIN_DENOMINATOR", () => {
    const smallTable: PrevalenceTable = {
      denominator: 19,
      denominator_label: "public setups benchmarked",
      dimensions: { "7": 1 },
    };
    const out = pickHeadlineRarity([7], NAMES, smallTable);
    expect(out).toBeNull();
  });

  it("returns null when denominator is exactly MIN_DENOMINATOR - 1 but not at MIN_DENOMINATOR itself", () => {
    const atMin: PrevalenceTable = {
      denominator: 20,
      denominator_label: "public setups benchmarked",
      dimensions: { "7": 1 },
    };
    const out = pickHeadlineRarity([7], NAMES, atMin);
    expect(out).not.toBeNull();
  });

  it("returns null when the user has no qualifying strengths (empty haves)", () => {
    const out = pickHeadlineRarity([], NAMES, TABLE);
    expect(out).toBeNull();
  });

  it("returns null when none of the user's haves appear in the table", () => {
    const out = pickHeadlineRarity([99, 100], NAMES, TABLE);
    expect(out).toBeNull();
  });

  it("returns null when all of the user's haves are above the rarity ceiling", () => {
    const out = pickHeadlineRarity([1, 18], NAMES, TABLE); // 90% and 26%
    expect(out).toBeNull();
  });
});
