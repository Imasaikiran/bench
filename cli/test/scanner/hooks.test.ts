import { describe, it, expect } from "vitest";
import { readHooks } from "../../src/scanner/hooks";

describe("readHooks", () => {
  it("explorer: no hooks dir → all zeros, empty events", async () => {
    const r = await readHooks("test/fixtures/explorer");
    expect(r.configured).toBe(0);
    expect(r.orphaned).toBe(0);
    expect(r.events).toEqual({});
  });

  it("operator: 3 hook files, all referenced in 3 events", async () => {
    const r = await readHooks("test/fixtures/operator");
    expect(r.configured).toBe(3);
    expect(r.orphaned).toBe(0);
    expect(Object.keys(r.events)).toHaveLength(3);
    expect(r.events["PreToolUse"]).toBeDefined();
    expect(r.events["PostToolUse"]).toBeDefined();
    expect(r.events["Stop"]).toBeDefined();
  });

  it("orphan-hook: hook file on disk but not referenced in settings", async () => {
    const r = await readHooks("test/fixtures/orphan-hook");
    expect(r.configured).toBe(0);
    expect(r.orphaned).toBe(1);
    expect(r.events).toEqual({});
  });

  it("happy path: parseWarnings is empty array", async () => {
    const r = await readHooks("test/fixtures/operator");
    expect(r.parseWarnings).toEqual([]);
  });
});
