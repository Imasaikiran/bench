import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readGitSignals } from "../../src/scanner/git";

describe("git", () => {
  let repo: string;
  // Track extra tempdirs created inside tests for cleanup.
  const extraDirs: string[] = [];

  beforeAll(() => {
    repo = mkdtempSync(join(tmpdir(), "bench-git-"));
    execSync("git init -q", { cwd: repo });
    execSync('git config user.email a@b.c && git config user.name x', { cwd: repo });
    writeFileSync(join(repo, "a"), "1");
    execSync("git add . && git commit -q -m 'feat: add a'", { cwd: repo });
    writeFileSync(join(repo, "a"), "2");
    execSync("git add . && git commit -q -m 'fix: tweak'", { cwd: repo });
    writeFileSync(join(repo, "a"), "3");
    execSync("git add . && git commit -q -m 'random noise'", { cwd: repo });
  });

  afterAll(() => {
    // Best-effort cleanup; OS reaps /tmp eventually.
    try { rmSync(repo, { recursive: true, force: true }); } catch {}
    for (const d of extraDirs) {
      try { rmSync(d, { recursive: true, force: true }); } catch {}
    }
  });

  it("extracts signature verbs from commits", async () => {
    const r = await readGitSignals([repo], []);
    expect(r.conventionalRatio).toBeCloseTo(2/3, 1);
    expect(r.signatureVerbs.length).toBeGreaterThan(0);
  });

  // Spec uses /tmp/definitely-not-a-repo-xxx; we use an empty tempdir for determinism.
  it("returns zeros when git missing / not a repo", async () => {
    const empty = mkdtempSync(join(tmpdir(), "bench-git-empty-"));
    const r = await readGitSignals([empty], []);
    expect(r.conventionalRatio).toBe(0);
    // Track for cleanup
    rmSync(empty, { recursive: true, force: true });
  });

  it("commitBurstCorrelation > 0 when ccActiveHours overlaps commit hour", async () => {
    // Read commit timestamps from the repo we built in beforeAll, derive their
    // hour buckets, pass those as ccActiveHours, and verify the correlation
    // is exactly 1.0 (every commit overlaps).
    const ts = execSync(`git -C "${repo}" log --pretty=%ct`, { encoding: "utf8" })
      .trim().split("\n")
      .map((s) => new Date(Number(s) * 1000).toISOString().slice(0, 13));
    const r = await readGitSignals([repo], ts);
    expect(r.commitBurstCorrelation).toBe(1);
  });

  it("commitBurstCorrelation accepts a Set as well as an array", async () => {
    const ts = execSync(`git -C "${repo}" log --pretty=%ct`, { encoding: "utf8" })
      .trim().split("\n")
      .map((s) => new Date(Number(s) * 1000).toISOString().slice(0, 13));
    const r = await readGitSignals([repo], new Set(ts));
    expect(r.commitBurstCorrelation).toBe(1);
  });

  it("signatureVerbs returns at most 3 verbs", async () => {
    const r = await readGitSignals([repo], []);
    expect(r.signatureVerbs.length).toBeLessThanOrEqual(3);
  });

  it("parses subjects containing a literal pipe character", () => {
    // Use a separate repo so we don't perturb counts in the other tests.
    const r2 = mkdtempSync(join(tmpdir(), "bench-git-pipe-"));
    extraDirs.push(r2);
    execSync("git init -q", { cwd: r2 });
    execSync('git config user.email a@b.c && git config user.name x', { cwd: r2 });
    writeFileSync(join(r2, "f"), "x");
    // Subject contains a |
    execSync(`git add . && git commit -q -m "feat: pipe|in|subject works"`, { cwd: r2 });
    return readGitSignals([r2], []).then((r) => {
      expect(r.commitsTotal).toBe(1);
      expect(r.conventionalRatio).toBe(1);
      // First word after the conventional prefix is "pipe", not "pipe|in|subject"
      expect(r.signatureVerbs[0]).toBe("pipe");
    });
  });

  // Note: the Number.isFinite(ctNum) guard in git.ts is defensive against
  // future format changes; not exercised by tests since git always emits
  // a valid Unix epoch for %ct.
});
