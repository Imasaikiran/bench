import { describe, it, expect } from "vitest";
import { inferTier, computeHoursWithCc, HOURS_CAP, HOURS_FLOOR } from "../../src/rubric/persona";

describe("persona", () => {
  it("returns Explorer when weeks < 4", () => {
    expect(inferTier({ weeks_on_cc: 2, sessions_total: 10 } as any)).toBe("Explorer");
  });
  it("returns Tinkerer on matching thresholds", () => {
    expect(inferTier({
      weeks_on_cc: 14, sessions_total: 100, skills_total: 6, skills_unused_ratio: 0.33,
    } as any)).toBe("Tinkerer");
  });
  it("caps hours at 3120", () => {
    // 12_000_000s / 3600 = 3333h → capped to 3120 (HOURS_CAP).
    // Plan §1888 test had a literal-arithmetic bug (5_000_000s = 1389h, below cap).
    expect(computeHoursWithCc(12_000_000)).toBe(HOURS_CAP);
  });
  it("floors hours (returns null) when < 5h", () => {
    expect(computeHoursWithCc(60 * 60 * 4)).toBe(null);
  });
});
