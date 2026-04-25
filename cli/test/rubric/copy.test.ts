import { describe, it, expect } from "vitest";
import { deriveCopy } from "../../src/rubric/copy";

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
});
