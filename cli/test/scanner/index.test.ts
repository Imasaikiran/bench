import { describe, it, expect } from "vitest";
import { scan } from "../../src/scanner";

describe("scanner.scan", () => {
  it("tinkerer fixture produces payload-shaped counts", async () => {
    const r = await scan("test/fixtures/tinkerer", { git: false });
    expect(r.counts.sessions_total).toBeGreaterThanOrEqual(100);
    expect(r.counts.skills_total).toBe(6);
    expect(r.counts.skills_active).toBe(4);
    expect(r.counts.skills_unused_ratio).toBeCloseTo(2/6, 2);
    expect(r.counts.claude_md_lines).toBeGreaterThan(20);
    expect(r.counts.coherence_score).toBeGreaterThan(0);
    expect(r.counts.coherence_score).toBeLessThanOrEqual(1);
  });
});
