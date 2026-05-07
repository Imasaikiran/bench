import { describe, it, expect, beforeAll } from "vitest";
import { readConfigSurface } from "../../src/scanner/config";
import { mkdtemp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
    const allow = (r.settings.permissions as { allow?: unknown[] } | undefined)?.allow;
    expect(allow?.length).toBeGreaterThanOrEqual(3);
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

  describe("non-ENOENT errors surface as warnings", () => {
    let claudeHome: string;

    beforeAll(async () => {
      // Create a tmpdir that looks like a .claude home but has a directory
      // where settings.json should be — this triggers EISDIR/ENOTDIR, not ENOENT.
      claudeHome = await mkdtemp(join(tmpdir(), "bench-test-"));
      await mkdir(join(claudeHome, "settings.json")); // directory masquerading as file
    });

    it("emits a warning naming settings.json on non-ENOENT error", async () => {
      const r = await readConfigSurface(claudeHome);
      expect(r.parseWarnings.some((w) => w.includes("settings.json"))).toBe(true);
    });

    it("ENOENT (missing settings.local.json) remains silent", async () => {
      const r = await readConfigSurface(claudeHome);
      // settings.local.json simply doesn't exist — no warning for it
      expect(r.parseWarnings.every((w) => !w.includes("settings.local.json"))).toBe(true);
    });
  });
});
