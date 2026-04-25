import { describe, it, expect } from "vitest";
import { renderPreview } from "../src/preview";

describe("renderPreview", () => {
  it("renders hero + tier + wk", () => {
    const s = renderPreview({ hours_with_cc: 187, score: 62, tier: "Tinkerer", weeks_on_cc: 14 } as any);
    expect(s).toContain("187h");
    expect(s).toContain("hours with Claude Code");
    expect(s).toContain("Bench 62");
    expect(s).toContain("Tinkerer");
    expect(s).toContain("Wk 14");
  });
  it("hides hero when hours_with_cc null", () => {
    const s = renderPreview({ hours_with_cc: null, score: 12, tier: "Explorer", weeks_on_cc: 2 } as any);
    expect(s).not.toContain("h\n  hours with Claude Code");
    expect(s).toContain("come back in a week");
  });
});
