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

  it("returns Craftsman on matching thresholds", () => {
    expect(inferTier({
      weeks_on_cc: 12, sessions_total: 100,
      skills_total: 4, skills_unused_ratio: 0.1,
      plan_mode_ratio: 0.3, coherence_score: 0.7,
    } as any)).toBe("Craftsman");
  });

  it("returns Operator on matching thresholds", () => {
    expect(inferTier({
      weeks_on_cc: 20, sessions_total: 200,
      skills_total: 4, skills_unused_ratio: 0.1,
      plan_mode_ratio: 0.3, coherence_score: 0.8,
      agents_configured: 3, hooks_configured: 5, automation_events: 400,
    } as any)).toBe("Operator");
  });

  it("returns Conductor when all conditions met (highest tier wins)", () => {
    expect(inferTier({
      weeks_on_cc: 30, sessions_total: 500,
      skills_total: 8, skills_unused_ratio: 0.05,
      plan_mode_ratio: 0.4, coherence_score: 0.85,
      agents_configured: 4, hooks_configured: 6, automation_events: 600,
      cross_project_consistency_score: 0.8,
      sub_dir_claude_md_count: 3, commit_burst_correlation: 0.5,
    } as any)).toBe("Conductor");
  });

  it("returns 5 at exactly 5h (floor inclusive)", () => {
    // Boundary: h = 5 → not < 5 → returns 5.
    expect(computeHoursWithCc(60 * 60 * 5)).toBe(5);
  });

  it("returns null on NaN input", () => {
    expect(computeHoursWithCc(NaN)).toBe(null);
  });
});
