import { describe, it, expect } from "vitest";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { scan } from "../../src/scanner";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");
const fixRoot = join(fixturesDir, "tinkerer");

describe("scanner.scan", () => {
  it("tinkerer fixture produces payload-shaped counts", async () => {
    const r = await scan(fixRoot, { git: false });
    expect(r.counts.sessions_total).toBeGreaterThanOrEqual(100);
    expect(r.counts.skills_total).toBe(6);
    expect(r.counts.skills_active).toBe(4);
    expect(r.counts.skills_unused_ratio).toBeCloseTo(2/6, 2);
    expect(r.counts.claude_md_lines).toBeGreaterThan(20);
    expect(r.counts.coherence_score).toBeGreaterThan(0);
    expect(r.counts.coherence_score).toBeLessThanOrEqual(1);
  });

  it("emits derived predicate fields needed by score.ts", async () => {
    const r = await scan(fixRoot, { git: false });
    const c = r.counts;

    // tinkerer: 4 allow entries, 1 mcp (filesystem), no agents/hooks/github.
    expect(c.permissions_allow_count).toBe(4);
    expect(c.settings_nonempty).toBe(true);
    expect(c.mcp_has_github).toBe(false);
    expect(c.review_agent).toBe(false);
    expect(c.test_agent).toBe(false);
    expect(c.any_hook_present).toBe(false);
    expect(c.orphaned_hooks_fraction).toBe(0);
    expect(c.duplicate_skill_fraction).toBe(0);
    expect(c.distinct_heading_count).toBeGreaterThan(0);
    expect(c.project_root_count).toBeGreaterThanOrEqual(1);
    expect(c.conventional_ratio).toBe(0); // git: false → 0
    const ratio = c.plan_mode_ratio as number;
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
  });

  it("operator fixture detects review/test agents and any_hook_present", async () => {
    const r = await scan(join(fixturesDir, "operator"), { git: false });
    const c = r.counts;
    expect(c.review_agent).toBe(true);
    expect(c.test_agent).toBe(true);
    expect(c.any_hook_present).toBe(true);
    expect(c.permissions_allow_count).toBe(12);
    expect(c.mcp_has_github).toBe(false); // filesystem + sqlite, no github
    expect(c.settings_nonempty).toBe(true);
  });

  it("with-github-mcp fixture flips mcp_has_github", async () => {
    const r = await scan(join(fixturesDir, "with-github-mcp"), { git: false });
    expect(r.counts.mcp_has_github).toBe(true);
  });

  it("explorer fixture (empty settings) reports false/0 for derived flags", async () => {
    const r = await scan(join(fixturesDir, "explorer"), { git: false });
    const c = r.counts;
    expect(c.permissions_allow_count).toBe(0);
    expect(c.settings_nonempty).toBe(false);
    expect(c.any_hook_present).toBe(false);
    expect(c.mcp_has_github).toBe(false);
    expect(c.review_agent).toBe(false);
    expect(c.test_agent).toBe(false);
  });
});
