import { describe, it, expect } from "vitest";
import { deriveCopy, gerundize } from "../../src/rubric/copy";

describe("gerundize", () => {
  it("drops silent e (update -> updating)", () => {
    expect(gerundize("update")).toBe("updating");
    expect(gerundize("merge")).toBe("merging");
    expect(gerundize("prune")).toBe("pruning");
  });
  it("ie -> ying (die -> dying)", () => {
    expect(gerundize("die")).toBe("dying");
  });
  it("preserves consonant + plain ing (build -> building)", () => {
    expect(gerundize("build")).toBe("building");
    expect(gerundize("add")).toBe("adding");
    // CVC consonant-doubling (ship -> shipping) intentionally NOT handled —
    // gerundize returns "shiping" for those. Acceptable for our copy use case.
  });
  it("preserves ee (see -> seeing)", () => {
    expect(gerundize("see")).toBe("seeing");
  });
});

describe("deriveCopy", () => {
  it("filters signature_verbs down to known verbs only", () => {
    // Old contract pinned raw pass-through (no filtering); B1's pickVerbs now
    // filters non-verbs like "question" out. Updated: install/question dropped
    // (not in KNOWN_VERBS), only "prune" survives.
    const r = deriveCopy({ signatureVerbs: ["install", "prune", "question"] } as any);
    expect(r.signature_verbs).toEqual(["prune"]);
  });
  it("hours meaning in workdays", () => {
    expect(deriveCopy({ hours_with_cc: 187 } as any).hours_meaning).toContain("23 workdays");
  });
  it("hours_label fixed string", () => {
    expect(deriveCopy({} as any).hours_label).toBe("hours with Claude Code");
  });
  it("falls back to a stub identity when no verbs and no counts", () => {
    // Old contract pinned "You build." (a fake default verb). New contract:
    // no fabricated verb, no evidence -> honest stub line instead.
    expect(deriveCopy({} as any).identity).toBe("Early days. Come back after a few more sessions.");
  });
  it("returns empty hours_meaning on NaN input", () => {
    expect(deriveCopy({ hours_with_cc: NaN } as any).hours_meaning).toBe("");
  });
});

describe("deriveCopy identity", () => {
  it("uses named artifacts when counts are strong", () => {
    const c = deriveCopy({
      signatureVerbs: ["add", "merge"],
      hours_with_cc: 161,
      skillsTotal: 445, projectRoots: 73, sessionsTotal: 250, weeksOnCc: 9,
      planModeRatio: 0.4,
    });
    expect(c.identity).toMatch(/445|73|250/);
    expect(c.identity).not.toMatch(/weekly/);
    expect(c.identity.endsWith(".")).toBe(true);
  });

  it("falls back to a short true line when evidence is thin", () => {
    const c = deriveCopy({ signatureVerbs: [], hours_with_cc: null,
      skillsTotal: 0, projectRoots: 0, sessionsTotal: 3, weeksOnCc: 1, planModeRatio: 0 });
    expect(c.identity.length).toBeGreaterThan(0);
    expect(c.identity).not.toMatch(/undefined|NaN|\bto learn\. You\b.*\bto focus\b/);
  });

  it("never interpolates a non-verb even if passed one", () => {
    const c = deriveCopy({ signatureVerbs: ["weekly", "wip"], hours_with_cc: 20,
      skillsTotal: 5, projectRoots: 2, sessionsTotal: 40, weeksOnCc: 4, planModeRatio: 0 });
    expect(c.identity).not.toMatch(/weekly|wip/);
  });

  it("combines the sessions clause with the verb clause", () => {
    // Covers the verb-clause branch (planModeRatio below threshold, verbs present)
    // stacked on the sessions clause (skills/roots too low for the skills clause).
    const c = deriveCopy({ signatureVerbs: ["ship"], hours_with_cc: 20,
      skillsTotal: 0, projectRoots: 0, sessionsTotal: 25, weeksOnCc: 3, planModeRatio: 0 });
    expect(c.identity).toContain("25 sessions in 3 weeks");
    // Second clause is sentence-capitalized by the join step, hence /i.
    expect(c.identity).toMatch(/you ship more than anything else/i);
  });

  it("pins the full two-clause identity string (grammar invariant)", () => {
    // Guards the capitalize-and-join contract: each clause starts lowercase with
    // no trailing period; the join step sentence-capitalizes and adds periods.
    const c = deriveCopy({
      signatureVerbs: ["add", "merge"],
      hours_with_cc: 161,
      skillsTotal: 445, projectRoots: 73, sessionsTotal: 250, weeksOnCc: 9,
      planModeRatio: 0.4,
    });
    expect(c.identity).toBe(
      "445 skills installed across 73 projects: you collect capability faster than you spend it. You plan before you build.",
    );
  });
});
