import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, symlinkSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isWithinAllowedPrefixes, resolveSafely } from "../src/paths";

describe("paths", () => {
  let root: string;
  beforeEach(() => { root = mkdtempSync(join(tmpdir(), "bench-")); });

  it("allows paths under home/.claude", () => {
    expect(isWithinAllowedPrefixes(join(root, "a/b"), [root])).toBe(true);
  });
  it("rejects escaping paths", () => {
    expect(isWithinAllowedPrefixes("/etc/passwd", [root])).toBe(false);
  });
  it("rejects symlink escaping allowed prefix", () => {
    mkdirSync(join(root, "sub"));
    writeFileSync("/tmp/bench-escape-target", "x");
    symlinkSync("/tmp/bench-escape-target", join(root, "sub", "bad"));
    expect(resolveSafely(join(root, "sub", "bad"), [root])).toBe(null);
  });
});
