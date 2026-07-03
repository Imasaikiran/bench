import { describe, it, expect } from "vitest";
import { renderMustHaves } from "../../src/rubric/musthave-copy";
import type { MustHaveItem } from "../../src/rubric/musthave-copy";

const FOCUS: MustHaveItem = {
  id: 21,
  name: "Focus",
  rationale:
    "A tight, current CLAUDE.md beats a sprawling one nobody re-reads; focus is a pruning habit, not a one-time write.",
};

const POST_TOOL_USE: MustHaveItem = {
  id: 6,
  name: "PostToolUse hook",
  rationale: "Formatters and linters running post-tool are the highest-leverage automation surface.",
};

describe("renderMustHaves", () => {
  it("renders musthaves as name + reason, never a raw rubric id", () => {
    const lines = renderMustHaves([FOCUS], { confidence: "high" });
    expect(lines[0]).not.toMatch(/^#\d+/);
    expect(lines.join(" ")).not.toMatch(/#\d+/);
    expect(lines[0]).toMatch(/focus|prune/i);
  });

  it("includes a reason fragment drawn from the rubric rationale", () => {
    const lines = renderMustHaves([POST_TOOL_USE], { confidence: "high" });
    expect(lines[0]).toMatch(/Focus|PostToolUse/);
    expect(lines[0]).toMatch(/formatters|linters|automation/i);
  });

  it("keeps personalized items when confidence is high", () => {
    const lines = renderMustHaves([FOCUS, POST_TOOL_USE], { confidence: "high" });
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/Focus/);
    expect(lines[1]).toMatch(/PostToolUse/);
  });

  it("keeps personalized items when confidence is unknown (no sessions at all)", () => {
    const lines = renderMustHaves([FOCUS], { confidence: "unknown" });
    expect(lines[0]).toMatch(/Focus/);
    expect(lines.join(" ")).not.toMatch(/community|couldn.t verify/i);
  });

  it("shows the community list unpersonalized when confidence is low", () => {
    const lines = renderMustHaves([FOCUS], { confidence: "low" });
    expect(lines.join(" ")).toMatch(/community|couldn.t verify/i);
    expect(lines[0]).toMatch(/couldn.t verify/i);
    expect(lines).toHaveLength(2);
  });

  it("renders the low-confidence banner exactly once, not per item", () => {
    const lines = renderMustHaves([FOCUS, POST_TOOL_USE], { confidence: "low" });
    expect(lines.filter((l) => /couldn.t verify/i.test(l))).toHaveLength(1);
    expect(lines).toHaveLength(3);
    expect(lines[1]).toMatch(/^Focus: /);
    expect(lines[2]).toMatch(/^PostToolUse hook: /);
  });

  it("low-confidence output still names the dimension, just not as a personal accusation", () => {
    const lines = renderMustHaves([FOCUS], { confidence: "low" });
    expect(lines.join(" ")).toMatch(/Focus/);
    expect(lines.join(" ")).not.toMatch(/#\d+/);
  });

  it("no em dashes in rendered copy", () => {
    const lines = renderMustHaves([FOCUS, POST_TOOL_USE], { confidence: "low" });
    expect(lines.join(" ")).not.toMatch(/—/);
  });

  it("returns an empty array for an empty item list", () => {
    expect(renderMustHaves([], { confidence: "high" })).toEqual([]);
    expect(renderMustHaves([], { confidence: "low" })).toEqual([]);
  });
});
