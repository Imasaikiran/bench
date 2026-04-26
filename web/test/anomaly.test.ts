import { describe, it, expect } from "vitest";
import { detectAnomalies } from "../lib/anomaly";

function basePayload(over: Record<string, unknown> = {}) {
  return {
    weeks_on_cc: 14,
    hours_with_cc: 187,
    score: 62,
    counts: {
      sessions_total: 60,
      skills_total: 6,
      coherence_score: 0.6,
      skills_unused_ratio: 0.33,
      ...((over["counts"] as Record<string, unknown>) ?? {}),
    },
    ...over,
  } as never; // narrow at call sites; we only touch the fields the function uses
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const baseScored = { score: 62, tier: "Tinkerer", chapters: {}, rubricVersion: "0.1.0" } as any;

describe("detectAnomalies", () => {
  it("score_high_sessions_low fires when scored.score>85 + sessions_total<10", () => {
    const r = detectAnomalies(basePayload({ counts: { sessions_total: 3 } }), { ...baseScored, score: 90 });
    expect(r).toContain("score_high_sessions_low");
  });
  it("hours_high_no_skills fires when hours>500 + skills_total=0", () => {
    const r = detectAnomalies(basePayload({ hours_with_cc: 600, counts: { skills_total: 0 } }), baseScored);
    expect(r).toContain("hours_high_no_skills");
  });
  it("too_clean fires when coherence=1.0 + skills_unused_ratio=0", () => {
    const r = detectAnomalies(basePayload({ counts: { coherence_score: 1.0, skills_unused_ratio: 0 } }), baseScored);
    expect(r).toContain("too_clean");
  });
  it("weeks_absurd fires when weeks_on_cc>100", () => {
    const r = detectAnomalies(basePayload({ weeks_on_cc: 150 }), baseScored);
    expect(r).toContain("weeks_absurd");
  });
  it("client_reported_score_mismatch fires when scored.score !== payload.score", () => {
    const r = detectAnomalies(basePayload({ score: 99 }), { ...baseScored, score: 62 });
    expect(r).toContain("client_reported_score_mismatch");
  });
  it("clean payload returns empty array", () => {
    const r = detectAnomalies(basePayload(), baseScored);
    expect(r).toEqual([]);
  });
});
