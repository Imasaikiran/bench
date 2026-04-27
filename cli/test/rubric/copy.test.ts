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
  it("picks top 3 verbs from git verbs, falls back to generic", () => {
    expect(deriveCopy({ signatureVerbs: [] } as any).signature_verbs).toEqual(["build"]);
    const r = deriveCopy({ signatureVerbs: ["install", "prune", "question"] } as any);
    expect(r.signature_verbs).toEqual(["install", "prune", "question"]);
    expect(r.identity).toContain("install");
  });
  it("hours meaning in workdays", () => {
    expect(deriveCopy({ hours_with_cc: 187 } as any).hours_meaning).toContain("23 workdays");
  });
  it("hours_label fixed string", () => {
    expect(deriveCopy({} as any).hours_label).toBe("hours with Claude Code");
  });
  it("uses 1-verb identity when no signature verbs", () => {
    expect(deriveCopy({} as any).identity).toBe("You build.");
  });
  it("returns empty hours_meaning on NaN input", () => {
    expect(deriveCopy({ hours_with_cc: NaN } as any).hours_meaning).toBe("");
  });
  it("silently drops the 2nd verb when only 2 supplied (1-verb fallback)", () => {
    // Locks current contract: 3-verb identity requires exactly 3 verbs;
    // 2-verb input renders as 1-verb (uses verbs[0] only).
    expect(deriveCopy({ signatureVerbs: ["ship", "ignore"] } as any).identity).toBe("You ship.");
  });
});
