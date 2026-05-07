import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, symlinkSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { isWithinAllowedPrefixes, resolveSafely } from "../src/paths";

describe("paths", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "bench-"));
  });

  it("allows paths under home/.claude", () => {
    expect(isWithinAllowedPrefixes(join(root, "a/b"), [root])).toBe(true);
  });

  it("rejects escaping paths", () => {
    expect(isWithinAllowedPrefixes("/etc/passwd", [root])).toBe(false);
  });

  it("rejects symlink escaping allowed prefix", () => {
    // Hermetic: target lives in a sibling tmpdir outside `root`, so the test
    // leaves no /tmp/bench-* litter between runs.
    const sibling = mkdtempSync(join(tmpdir(), "bench-target-"));
    const target = join(sibling, "secret");
    writeFileSync(target, "x");
    mkdirSync(join(root, "sub"));
    symlinkSync(target, join(root, "sub", "bad"));
    expect(resolveSafely(join(root, "sub", "bad"), [root])).toBe(null);
  });

  // Regression: parent traversal must collapse before the prefix check.
  it("rejects .. traversal that escapes the prefix", () => {
    expect(
      isWithinAllowedPrefixes(join(root, "../../etc/passwd"), [root]),
    ).toBe(false);
  });

  // Regression: empty prefix list fails closed.
  it("returns false when prefix list is empty", () => {
    expect(isWithinAllowedPrefixes(root, [])).toBe(false);
  });

  // Regression: prevent /foo matching /foobar (the +sep guard in impl).
  it("rejects sibling paths sharing a name prefix", () => {
    const a = join(root, "foo");
    const b = join(dirname(a), "foobar");
    mkdirSync(a);
    mkdirSync(b);
    expect(isWithinAllowedPrefixes(b, [a])).toBe(false);
  });
});
