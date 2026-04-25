import { describe, it, expect } from "vitest";
import { readSessions, computeActiveSeconds } from "../../src/scanner/sessions";

describe("sessions", () => {
  it("caps gaps > 15min at 900s", () => {
    const ts = [0, 60, 60 + 2000, 60 + 2000 + 30].map((s) => s * 1000);
    expect(computeActiveSeconds(ts)).toBe(60 + 900 + 30);
  });
  it("detects plan_mode markers", async () => {
    const r = await readSessions("test/fixtures/tinkerer");
    expect(r.sessionsTotal).toBeGreaterThan(50);
    expect(r.planModeSessions).toBeGreaterThan(0);
  });
  it("survives malformed lines", async () => {
    const r = await readSessions("test/fixtures/bad-jsonl");
    expect(r.sessionsTotal).toBe(1);
    expect(r.skippedLines).toBeGreaterThan(0);
  });
  it("weeks_on_cc derived from earliest session", async () => {
    const r = await readSessions("test/fixtures/tinkerer");
    expect(r.weeksOnCc).toBeGreaterThanOrEqual(4);
  });
});
