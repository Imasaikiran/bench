import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readGitSignals } from "../../src/scanner/git";

describe("git", () => {
  let repo: string;
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

  it("extracts signature verbs from commits", async () => {
    const r = await readGitSignals([repo], []);
    expect(r.conventionalRatio).toBeCloseTo(2/3, 1);
    expect(r.signatureVerbs.length).toBeGreaterThan(0);
  });

  it("returns zeros when git missing / not a repo", async () => {
    const r = await readGitSignals(["/tmp/definitely-not-a-repo-xxx"], []);
    expect(r.conventionalRatio).toBe(0);
  });
});
