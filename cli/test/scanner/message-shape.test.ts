import { describe, it, expect } from "vitest";
import { normalizeEntry } from "../../src/scanner/message-shape";

describe("normalizeEntry", () => {
  it("extracts role and content from the real Claude Code envelope", () => {
    const raw = {
      type: "assistant",
      timestamp: "2026-05-01T10:00:00Z",
      cwd: "/Users/x/proj",
      message: { role: "assistant", content: [{ type: "tool_use", name: "Skill", input: { skill: "brainstorming" } }] },
    };
    const n = normalizeEntry(raw);
    expect(n.role).toBe("assistant");
    expect(n.content).toHaveLength(1);
    expect(n.timestamp).toBe("2026-05-01T10:00:00Z");
    expect(n.cwd).toBe("/Users/x/proj");
  });

  it("falls back to legacy top-level shape when message is absent", () => {
    const raw = { role: "assistant", content: [], timestamp: "2026-05-01T10:00:00Z" };
    const n = normalizeEntry(raw);
    expect(n.role).toBe("assistant");
    expect(n.content).toEqual([]);
  });

  it("returns nulls for non-message operation lines", () => {
    const raw = { type: "operation", operation: "compact", timestamp: "2026-05-01T10:00:00Z" };
    const n = normalizeEntry(raw);
    expect(n.role).toBeNull();
    expect(n.content).toBeNull();
    expect(n.timestamp).toBe("2026-05-01T10:00:00Z");
  });
});
