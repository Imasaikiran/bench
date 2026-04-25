import { describe, it, expect } from "vitest";
import { readAgents } from "../../src/scanner/agents";

describe("readAgents", () => {
  it("explorer: no agents dir → all zeros and false flags", async () => {
    const r = await readAgents("test/fixtures/explorer");
    expect(r.total).toBe(0);
    expect(r.withDescription).toBe(0);
    expect(r.reviewAgent).toBe(false);
    expect(r.testAgent).toBe(false);
  });

  it("operator: 3 agents (code-reviewer + release-driver + test-runner), reviewAgent and testAgent both true", async () => {
    const r = await readAgents("test/fixtures/operator");
    expect(r.total).toBe(3);
    expect(r.withDescription).toBe(3);
    expect(r.reviewAgent).toBe(true);
    expect(r.testAgent).toBe(true);
  });

  it("conductor: 4 agents, reviewAgent true, testAgent false", async () => {
    const r = await readAgents("test/fixtures/conductor");
    expect(r.total).toBe(4);
    expect(r.withDescription).toBe(4);
    expect(r.reviewAgent).toBe(true);
    expect(r.testAgent).toBe(false);
  });

  it("happy path: parseWarnings is empty array", async () => {
    const r = await readAgents("test/fixtures/operator");
    expect(r.parseWarnings).toEqual([]);
  });
});
