import { describe, it, expect } from "vitest";
import { renderPreview } from "../src/preview";

describe("renderPreview", () => {
  it("renders hero + tier + wk", () => {
    const s = renderPreview({ hours_with_cc: 187, score: 62, tier: "Tinkerer", weeks_on_cc: 14 });
    expect(s).toContain("187h");
    expect(s).toContain("hours with Claude Code");
    expect(s).toContain("Bench 62");
    expect(s).toContain("Tinkerer");
    expect(s).toContain("Wk 14");
  });
  it("hides hero when hours_with_cc null", () => {
    const s = renderPreview({ hours_with_cc: null, score: 12, tier: "Explorer", weeks_on_cc: 2 });
    expect(s).not.toContain("h\n  hours with Claude Code");
    expect(s).toContain("come back in a week");
  });

  // I-1: bad hours_with_cc values fall back to the no-hours hero
  it("undefined hours → fallback string", () => {
    const s = renderPreview({ hours_with_cc: undefined, score: 10, tier: "Explorer", weeks_on_cc: 1 });
    expect(s).toContain("come back in a week");
    expect(s).not.toContain("undefinedh");
  });
  it("NaN hours → fallback string", () => {
    const s = renderPreview({ hours_with_cc: NaN, score: 10, tier: "Explorer", weeks_on_cc: 1 });
    expect(s).toContain("come back in a week");
    expect(s).not.toContain("NaNh");
  });
  it("Infinity hours → fallback string", () => {
    const s = renderPreview({ hours_with_cc: Infinity, score: 10, tier: "Explorer", weeks_on_cc: 1 });
    expect(s).toContain("come back in a week");
    expect(s).not.toContain("Infinityh");
  });
  it("-1 hours → fallback string", () => {
    const s = renderPreview({ hours_with_cc: -1, score: 10, tier: "Explorer", weeks_on_cc: 1 });
    expect(s).toContain("come back in a week");
    expect(s).not.toContain("-1h");
  });
  it("0 hours → renders '0h' hero", () => {
    const s = renderPreview({ hours_with_cc: 0, score: 10, tier: "Explorer", weeks_on_cc: 1 });
    expect(s).toContain("0h");
    expect(s).toContain("hours with Claude Code");
  });

  // S-2/S-3: exact hero byte sequence
  it("exact hero byte sequence", () => {
    expect(
      renderPreview({ score: 62, tier: "Tinkerer", weeks_on_cc: 14, hours_with_cc: 187 }),
    ).toBe("187h\n  hours with Claude Code\n\nBench 62 \u00B7 Tinkerer \u00B7 Wk 14");
  });
  it("exact fallback byte sequence", () => {
    expect(
      renderPreview({ score: 62, tier: "Tinkerer", weeks_on_cc: 14, hours_with_cc: null }),
    ).toBe("(scoring without hours yet \u2014 come back in a week)\n\nBench 62 \u00B7 Tinkerer \u00B7 Wk 14");
  });
});
