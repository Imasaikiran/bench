import { describe, it, expect } from "vitest";
import { detectEnvironment, refuseIfUnsafe } from "../src/env";

describe("env guard", () => {
  it("detects CI via CI=true", () => {
    expect(detectEnvironment({ CI: "true" }).isCI).toBe(true);
  });
  it("detects GitHub Actions", () => {
    expect(detectEnvironment({ GITHUB_ACTIONS: "true" }).isCI).toBe(true);
  });
  it("detects root on unix", () => {
    expect(detectEnvironment({}, { getuid: () => 0 }).isRoot).toBe(true);
  });
  it("refuseIfUnsafe throws on root", () => {
    expect(() => refuseIfUnsafe({ isRoot: true, isCI: false, claudeHome: "~/.claude" }))
      .toThrow(/normal user/);
  });
  it("refuseIfUnsafe throws on CI", () => {
    expect(() => refuseIfUnsafe({ isRoot: false, isCI: true, claudeHome: "~/.claude" }))
      .toThrow(/not for CI/);
  });
  it("respects CLAUDE_HOME env var", () => {
    const env = detectEnvironment({ CLAUDE_HOME: "/tmp/alt-claude" });
    expect(env.claudeHome).toBe("/tmp/alt-claude");
    expect(env.claudeHomeOverridden).toBe(true);
  });
});
