import { describe, it, expect } from "vitest";
import { recommend, RUBRIC_VERSION } from "../lib/recommendations";
import type { PersonaShape, State } from "../lib/mapper";

function persona(states: Record<string, State[]>): PersonaShape {
  return {
    handle: "@x",
    initial: "X",
    weeks: 13,
    eyebrow: "",
    title: "",
    tiles: [],
    identity: "",
    hours: 0,
    hoursMeaning: "",
    signature: "",
    score: 0,
    tier: "Tinkerer",
    chapterNote: "",
    chapterTags: ["weak", "weak", "weak", "weak", "weak"],
    clusters: {
      Foundation: states["Foundation"] ?? Array(5).fill("have"),
      Automation: states["Automation"] ?? Array(5).fill("have"),
      Delegation: states["Delegation"] ?? Array(5).fill("have"),
      Craft: states["Craft"] ?? Array(5).fill("have"),
      Coherence: states["Coherence"] ?? Array(5).fill("have"),
    } as never,
    musthaves: Array(15).fill("missing") as never,
  };
}

describe("recommend", () => {
  it("emits empty list when every dimension is 'have'", () => {
    expect(recommend(persona({}))).toEqual([]);
  });

  it("orders missing before partial regardless of weight", () => {
    const p = persona({
      // Foundation #1 is missing (weight 1.0); Craft #18 is partial (weight 0.6).
      Foundation: ["missing", "have", "have", "have", "have"],
      Craft: ["have", "have", "partial", "have", "have"],
    });
    const recs = recommend(p);
    expect(recs[0]?.state).toBe("missing");
    expect(recs[recs.length - 1]?.state).toBe("partial");
  });

  it("among same state, orders by weight descending", () => {
    const p = persona({
      // Foundation #5 (Docs in .claude, weight 0.4) and Foundation #1
      // (Root CLAUDE.md, weight 1.0) both missing.
      Foundation: ["missing", "have", "have", "have", "missing"],
    });
    const recs = recommend(p);
    expect(recs[0]?.dimensionId).toBe(1); // weight 1.0
    expect(recs[1]?.dimensionId).toBe(5); // weight 0.4
  });

  it("text fields source from rubric.yaml verbatim (no editorial)", () => {
    const p = persona({ Foundation: ["missing", "have", "have", "have", "have"] });
    const r = recommend(p)[0]!;
    // Spot-check against rubric.yaml lines for dimension 1 (Root CLAUDE.md).
    expect(r.name).toBe("Root CLAUDE.md");
    expect(r.haveCriteria).toBe("exists, 20–300 lines");
    expect(r.rationale).toContain("House rules anchor every session");
  });

  it("exposes rubric version", () => {
    expect(typeof RUBRIC_VERSION).toBe("string");
    expect(RUBRIC_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("Foundation 0/100 input surfaces all five Foundation dimensions", () => {
    const p = persona({ Foundation: ["missing", "missing", "missing", "missing", "missing"] });
    const recs = recommend(p);
    const fd = recs.filter((r) => r.chapter === "Foundation");
    expect(fd).toHaveLength(5);
    expect(fd.map((r) => r.dimensionId).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
