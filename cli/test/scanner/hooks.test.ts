import { describe, it, expect } from "vitest";
import { readHooks } from "../../src/scanner/hooks";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

  it("counts inline settings-defined hooks even with no hook files on disk", async () => {
    const home = await mkdtemp(join(tmpdir(), "bench-test-"));
    await writeFile(
      join(home, "settings.json"),
      JSON.stringify({
        hooks: { SessionStart: [{ hooks: [{ command: "echo hi" }] }] },
      })
    );
    const r = await readHooks(home);
    expect(r.configured).toBeGreaterThanOrEqual(1);
  });

  describe("eventStates (Task A5)", () => {
    it("inline command (no file reference) -> present", async () => {
      const home = await mkdtemp(join(tmpdir(), "bench-test-"));
      await writeFile(
        join(home, "settings.json"),
        JSON.stringify({
          hooks: { SessionStart: [{ hooks: [{ command: "echo hi" }] }] },
        })
      );
      const r = await readHooks(home);
      expect(r.eventStates["SessionStart"]).toBe("present");
    });

    it("command referencing an existing hook file -> present", async () => {
      const r = await readHooks("test/fixtures/operator");
      expect(r.eventStates["PreToolUse"]).toBe("present");
      expect(r.eventStates["PostToolUse"]).toBe("present");
      expect(r.eventStates["Stop"]).toBe("present");
    });

    it("command referencing a missing hook file -> referenced", async () => {
      const home = await mkdtemp(join(tmpdir(), "bench-test-"));
      await writeFile(
        join(home, "settings.json"),
        JSON.stringify({
          hooks: {
            PreToolUse: [
              { hooks: [{ command: "~/.claude/hooks/does-not-exist.sh" }] },
            ],
          },
        })
      );
      const r = await readHooks(home);
      expect(r.eventStates["PreToolUse"]).toBe("referenced");
    });

    it("no event configured -> key absent from eventStates", async () => {
      const r = await readHooks("test/fixtures/explorer");
      expect(r.eventStates).toEqual({});
    });

    it("SessionEnd-only (no SessionStart) still yields a present state", async () => {
      const home = await mkdtemp(join(tmpdir(), "bench-test-"));
      await writeFile(
        join(home, "settings.json"),
        JSON.stringify({
          hooks: { SessionEnd: [{ hooks: [{ command: "echo bye" }] }] },
        })
      );
      const r = await readHooks(home);
      expect(r.eventStates["SessionEnd"]).toBe("present");
      expect(r.eventStates["SessionStart"]).toBeUndefined();
    });

    it("mixed commands in one event: any present command wins over referenced", async () => {
      const home = await mkdtemp(join(tmpdir(), "bench-test-"));
      await writeFile(
        join(home, "settings.json"),
        JSON.stringify({
          hooks: {
            PostToolUse: [
              {
                hooks: [
                  { command: "~/.claude/hooks/missing.sh" },
                  { command: "echo ok" },
                ],
              },
            ],
          },
        })
      );
      const r = await readHooks(home);
      expect(r.eventStates["PostToolUse"]).toBe("present");
    });
  });
});
