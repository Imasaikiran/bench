import { describe, it, expect } from "vitest";
import { pickVerbs, isKnownVerb } from "../../src/rubric/verbs";

describe("verb whitelist", () => {
  it("rejects non-verbs like 'weekly'", () => {
    expect(isKnownVerb("weekly")).toBe(false);
  });
  it("accepts real commit verbs", () => {
    for (const v of ["add", "fix", "refactor", "ship", "merge", "build"]) {
      expect(isKnownVerb(v)).toBe(true);
    }
  });
  it("filters a raw token list down to known verbs, preserving order", () => {
    expect(pickVerbs(["weekly", "fix", "chore", "refactor"])).toEqual(["fix", "refactor"]);
  });
});
