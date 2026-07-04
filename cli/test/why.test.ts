import { describe, it, expect } from "vitest";
import { formatWhy } from "../src/why";
import type { ScoreResult } from "../src/rubric/score";
import type { Rubric } from "../src/rubric/load";

// Minimal rubric fixture covering Foundation (5 dims) only.
const rubricFixture: Rubric = {
  version: "0.1.0",
  chapters: {
    Foundation: {
      dimensions: [
        { id: 1, name: "Root CLAUDE.md", weight: 1.0 },
        { id: 2, name: "settings.json", weight: 1.0 },
        { id: 3, name: "permissions allowlist", weight: 1.0 },
        { id: 4, name: "sub-dir CLAUDE.md", weight: 0.8 },
        { id: 5, name: "Docs in .claude", weight: 0.4 },
      ],
    },
    Automation: {
      dimensions: [
        { id: 6, name: "PostToolUse hook", weight: 1.0 },
      ],
    },
    Delegation: { dimensions: [] },
    Craft: { dimensions: [] },
    Hygiene: { dimensions: [] },
  },
};

const scoredFixture: ScoreResult = {
  score: 62,
  chapters: {
    Foundation: {
      score: 72,
      states: ["have", "partial", "missing", "missing", "have"],
    },
    Automation: {
      score: 40,
      states: ["have"],
    },
    Delegation: { score: 50, states: [] },
    Craft: { score: 60, states: [] },
    Hygiene: { score: 70, states: [] },
  },
};

describe("formatWhy", () => {
  it("contains '#1 Root CLAUDE.md' and 'have' (plan-required substrings)", () => {
    const out = formatWhy(scoredFixture, rubricFixture);
    expect(out).toContain("#1 Root CLAUDE.md");
    expect(out).toContain("have");
  });

  it("chapter order matches [Foundation, Automation, Delegation, Craft, Hygiene]", () => {
    const out = formatWhy(scoredFixture, rubricFixture);
    const chapterLines = out
      .split("\n")
      .filter((l) => !l.startsWith("  "));
    const names = chapterLines.map((l) => l.split(" ")[0]!);
    expect(names).toEqual([
      "Foundation",
      "Automation",
      "Delegation",
      "Craft",
      "Hygiene",
    ]);
  });

  it("includes chapter score header", () => {
    const out = formatWhy(scoredFixture, rubricFixture);
    expect(out).toContain("Foundation 72/100");
    expect(out).toContain("Automation 40/100");
  });

  it("shows 'partial' and 'missing' states", () => {
    const out = formatWhy(scoredFixture, rubricFixture);
    expect(out).toContain("partial");
    expect(out).toContain("missing");
  });

  it("missing rubric dimension does NOT throw — prints #? unknown", () => {
    // Automation chapter in rubric has 1 dimension but scored has 1 state,
    // so that's fine. Let's construct a case where states > dims.
    const scored: ScoreResult = {
      score: 50,
      chapters: {
        Foundation: {
          score: 50,
          states: ["have", "missing", "have", "missing", "have", "partial"], // 6 states but only 5 dims
        },
        Automation: { score: 50, states: [] },
        Delegation: { score: 50, states: [] },
        Craft: { score: 50, states: [] },
        Hygiene: { score: 50, states: [] },
      },
    };
    expect(() => formatWhy(scored, rubricFixture)).not.toThrow();
    const out = formatWhy(scored, rubricFixture);
    expect(out).toContain("#? unknown");
  });

  it("dot-leader aligns before state", () => {
    const out = formatWhy(scoredFixture, rubricFixture);
    // The dim line should contain dots between name and state
    const dimLine = out.split("\n").find((l) => l.includes("#1 Root CLAUDE.md"));
    expect(dimLine).toBeDefined();
    expect(dimLine).toMatch(/Root CLAUDE\.md.*have/);
  });
});
