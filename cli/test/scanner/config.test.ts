import { describe, it, expect } from "vitest";
import { readConfigSurface } from "../../src/scanner/config";

describe("readConfigSurface", () => {
  it("reads explorer fixture to empty-ish shape", async () => {
    const r = await readConfigSurface("test/fixtures/explorer");
    expect(r.claudeMd).toBeNull();
    expect(r.settings).toEqual({});
    expect(r.parseWarnings).toEqual([]);
  });
  it("reads tinkerer fixture", async () => {
    const r = await readConfigSurface("test/fixtures/tinkerer");
    expect(r.claudeMd?.lines).toBeGreaterThan(20);
    expect(r.claudeMd?.lines).toBeLessThan(300);
    expect(r.claudeMd?.headingCount).toBeGreaterThan(0);
    expect(r.settings.permissions?.allow?.length).toBeGreaterThanOrEqual(3);
  });
  it("handles broken JSON without throwing", async () => {
    const r = await readConfigSurface("test/fixtures/broken-json");
    expect(r.parseWarnings[0]).toMatch(/settings\.json/);
    expect(r.settings).toEqual({});
  });
  it("truncates files over 100KB", async () => {
    const r = await readConfigSurface("test/fixtures/huge-md");
    expect(r.claudeMd?.truncated).toBe(true);
  });
});
