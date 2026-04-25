import { describe, it, expect } from "vitest";
import { readMcp } from "../../src/scanner/mcp";

describe("readMcp", () => {
  it("explorer: no mcp.json, no mcpServers in settings → empty", async () => {
    const r = await readMcp("test/fixtures/explorer");
    expect(r.servers).toEqual([]);
    expect(r.hasGithub).toBe(false);
  });

  it("operator: reads mcpServers from settings.json → filesystem and sqlite", async () => {
    const r = await readMcp("test/fixtures/operator");
    expect(r.servers).toEqual(["filesystem", "sqlite"]);
    expect(r.hasGithub).toBe(false);
  });

  it("with-github-mcp: reads mcp.json, detects hasGithub true", async () => {
    const r = await readMcp("test/fixtures/with-github-mcp");
    expect(r.servers).toEqual(["github"]);
    expect(r.hasGithub).toBe(true);
  });

  it("happy path: parseWarnings is empty array", async () => {
    const r = await readMcp("test/fixtures/operator");
    expect(r.parseWarnings).toEqual([]);
  });
});
