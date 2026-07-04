import { describe, it, expect } from "vitest";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { scan } from "../../src/scanner";
import { normalizeSkillName, computeActiveSkills } from "../../src/scanner/index";

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

  describe("per-event hook state fields (Task A5)", () => {
    it("explorer: no hooks at all -> all four fields missing/false", async () => {
      const r = await scan(join(fixturesDir, "explorer"), { git: false });
      const c = r.counts;
      expect(c.post_tool_use_hook).toBe("missing");
      expect(c.pre_tool_use_hook).toBe("missing");
      expect(c.session_hook).toBe("missing");
      expect(c.verify_hook_present).toBe(false);
    });

    it("operator: PreToolUse/PostToolUse hooks reference existing files -> present; no session hook; no verify command -> false", async () => {
      const r = await scan(join(fixturesDir, "operator"), { git: false });
      const c = r.counts;
      expect(c.post_tool_use_hook).toBe("present");
      expect(c.pre_tool_use_hook).toBe("present");
      expect(c.session_hook).toBe("missing");
      expect(c.verify_hook_present).toBe(false);
    });

    it("command referencing a missing hook file -> referenced", async () => {
      const home = await mkdtemp(join(tmpdir(), "bench-test-"));
      await writeFile(
        join(home, "settings.json"),
        JSON.stringify({
          hooks: {
            PostToolUse: [
              { hooks: [{ command: "~/.claude/hooks/missing.sh" }] },
            ],
          },
        }),
      );
      const r = await scan(home, { git: false });
      expect(r.counts.post_tool_use_hook).toBe("referenced");
    });

    it("SessionEnd-only settings -> session_hook present", async () => {
      const home = await mkdtemp(join(tmpdir(), "bench-test-"));
      await writeFile(
        join(home, "settings.json"),
        JSON.stringify({
          hooks: { SessionEnd: [{ hooks: [{ command: "echo bye" }] }] },
        }),
      );
      const r = await scan(home, { git: false });
      expect(r.counts.session_hook).toBe("present");
    });

    it("verify_hook_present true when a hook command names a test/typecheck/lint step", async () => {
      const home = await mkdtemp(join(tmpdir(), "bench-test-"));
      await writeFile(
        join(home, "settings.json"),
        JSON.stringify({
          hooks: {
            PreToolUse: [{ hooks: [{ command: "npm run typecheck" }] }],
          },
        }),
      );
      const r = await scan(home, { git: false });
      expect(r.counts.verify_hook_present).toBe(true);
    });
  });
});

describe("normalizeSkillName", () => {
  it("strips plugin namespace prefix", () => {
    expect(normalizeSkillName("superpowers:brainstorming")).toBe("brainstorming");
  });
  it("lowercases and trims", () => {
    expect(normalizeSkillName("  Using-Superpowers ")).toBe("using-superpowers");
  });
  it("is idempotent on plain names", () => {
    expect(normalizeSkillName("cto-engineering-os")).toBe("cto-engineering-os");
  });
});

describe("computeActiveSkills", () => {
  it("counts a skill as active when session used its namespaced slug", () => {
    const skills = {
      total: 1,
      items: [{ dir: "/home/user/.claude/skills/brainstorming", name: "brainstorming", description: null }],
      parseWarnings: [],
    };
    const sessions = {
      sessionsTotal: 1,
      planModeSessions: 0,
      toolUseCount: 0,
      messageCount: 0,
      activeSecondsTotal: 0,
      weeksOnCc: 0,
      earliestStart: null,
      skippedLines: 0,
      readBytesSum: 0,
      readBytesCount: 0,
      projectRoots: [],
      usedSkills: ["superpowers:brainstorming"],
      parseWarnings: [],
    };
    expect(computeActiveSkills(skills, sessions)).toBe(1);
  });

  it("falls back to the directory slug when frontmatter name is null", () => {
    const skills = {
      total: 1,
      items: [{ dir: "/home/user/.claude/skills/foo-bar", name: null, description: null }],
      parseWarnings: [],
    };
    const sessions = {
      sessionsTotal: 1,
      planModeSessions: 0,
      toolUseCount: 0,
      messageCount: 0,
      activeSecondsTotal: 0,
      weeksOnCc: 0,
      earliestStart: null,
      skippedLines: 0,
      readBytesSum: 0,
      readBytesCount: 0,
      projectRoots: [],
      usedSkills: ["foo-bar"],
      parseWarnings: [],
    };
    expect(computeActiveSkills(skills, sessions)).toBe(1);
  });
});
