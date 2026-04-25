import { describe, it, expect } from "vitest";
import { readCommands } from "../../src/scanner/commands";

describe("readCommands", () => {
  it("explorer: no commands dir → zero totals", async () => {
    const r = await readCommands("test/fixtures/explorer");
    expect(r.total).toBe(0);
    expect(r.withDescription).toBe(0);
  });

  it("operator: 1 command with description", async () => {
    const r = await readCommands("test/fixtures/operator");
    expect(r.total).toBe(1);
    expect(r.withDescription).toBe(1);
  });

  it("conductor: 1 command with description", async () => {
    const r = await readCommands("test/fixtures/conductor");
    expect(r.total).toBe(1);
    expect(r.withDescription).toBe(1);
  });

  it("treats whitespace-only description as missing", async () => {
    const r = await readCommands("test/fixtures/empty-description-cmd");
    expect(r.total).toBe(1);
    expect(r.withDescription).toBe(0);
  });

  it("happy path: parseWarnings is empty array", async () => {
    const r = await readCommands("test/fixtures/operator");
    expect(r.parseWarnings).toEqual([]);
  });
});
