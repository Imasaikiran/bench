import { readConfigSurface } from "./config.js";
import { readSkills } from "./skills.js";
import type { SkillsReport } from "./skills.js";
import { readHooks } from "./hooks.js";
import type { HooksReport } from "./hooks.js";
import { readCommands } from "./commands.js";
import { readAgents } from "./agents.js";
import { readMcp } from "./mcp.js";
import { readSessions } from "./sessions.js";
import type { SessionsReport } from "./sessions.js";
import { readGitSignals } from "./git.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function round(n: number, d: number): number {
  const factor = 10 ** d;
  return Math.round(n * factor) / factor;
}

function clamp(min: number, max: number, value: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Count how many skill names from skills.items appear in sessions.usedSkills.
 * Match by exact equality on the frontmatter `name` field.
 */
function computeActiveSkills(skills: SkillsReport, sessions: SessionsReport): number {
  const usedSet = new Set(sessions.usedSkills);
  let active = 0;
  for (const skill of skills.items) {
    if (skill.name !== null && usedSet.has(skill.name)) {
      active++;
    }
  }
  return active;
}

/**
 * Fraction of duplicate skills: `1 - distinct/total`.
 * Distinct counts unique non-null `name` values.
 * Returns 0 when total === 0.
 */
function duplicateSkillFraction(skills: SkillsReport): number {
  if (skills.total === 0) return 0;
  const distinctNames = new Set(
    skills.items
      .map((s) => s.name)
      .filter((n): n is string => n !== null),
  );
  return 1 - distinctNames.size / skills.total;
}

/**
 * Fraction of orphaned hooks: `orphaned / max(configured + orphaned, 1)`.
 */
function orphanedFraction(hooks: HooksReport): number {
  const denom = Math.max(hooks.configured + hooks.orphaned, 1);
  return hooks.orphaned / denom;
}

/**
 * Coherence score in [0, 1]. Penalties:
 *   - duplicateSkills (0–1): full weight
 *   - orphanedHooks (0–1): full weight
 *   - claudeMdOverLong (0 or 1): 0.15 weight
 */
function computeCoherenceScore({
  duplicateSkills,
  orphanedHooks,
  claudeMdOverLong,
}: {
  duplicateSkills: number;
  orphanedHooks: number;
  claudeMdOverLong: number;
}): number {
  return clamp(0, 1, 1 - (duplicateSkills + orphanedHooks + 0.15 * claudeMdOverLong));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function scan(
  claudeHome: string,
  opts: { git: boolean } = { git: true },
) {
  const [cfg, skills, hooks, cmds, agents, mcp, sessions] = await Promise.all([
    readConfigSurface(claudeHome),
    readSkills(claudeHome),
    readHooks(claudeHome),
    readCommands(claudeHome),
    readAgents(claudeHome),
    readMcp(claudeHome),
    readSessions(claudeHome),
  ]);

  const skillsActive = computeActiveSkills(skills, sessions);
  const skillsUnusedRatio = skills.total === 0 ? 0 : 1 - skillsActive / skills.total;

  const ccActiveHours = new Set<string>();
  const git = opts.git
    ? await readGitSignals(sessions.projectRoots, ccActiveHours)
    : {
        conventionalRatio: 0,
        signatureVerbs: [] as string[],
        commitBurstCorrelation: 0,
        commitsTotal: 0,
        skipped: [] as string[],
      };

  // hooks.events is Record<string, string[]>; count total registered commands
  // across all event entries as the automation_events dimension.
  const automationEvents = Object.values(hooks.events).reduce(
    (sum, cmdsArr) => sum + cmdsArr.length,
    0,
  );

  const counts = {
    sessions_total: sessions.sessionsTotal,
    plan_mode_sessions: sessions.planModeSessions,
    skills_total: skills.total,
    skills_active: skillsActive,
    skills_unused_ratio: round(skillsUnusedRatio, 3),
    hooks_configured: hooks.configured,
    agents_configured: agents.total,
    commands_total: cmds.total,
    mcp_servers: mcp.servers.length,
    automation_events: automationEvents,
    // TODO(1.10+): implement worktrees reader (dim 18)
    worktrees_detected: 0,
    claude_md_lines: cfg.claudeMd?.lines ?? 0,
    // TODO(1.10+): implement sub-directory CLAUDE.md reader
    sub_dir_claude_md_count: 0,
    coherence_score: computeCoherenceScore({
      duplicateSkills: duplicateSkillFraction(skills),
      orphanedHooks: orphanedFraction(hooks),
      claudeMdOverLong: (cfg.claudeMd?.lines ?? 0) > 300 ? 1 : 0,
    }),
    commit_burst_correlation: round(git.commitBurstCorrelation, 3),
    weeks_on_cc: sessions.weeksOnCc,
    active_hours_total: sessions.activeSecondsTotal / 3600,
    avg_bytes_per_read:
      sessions.readBytesCount === 0
        ? 0
        : sessions.readBytesSum / sessions.readBytesCount,
  };

  return {
    counts,
    diagnostics: {
      redaction_hits: 0,
      parse_warnings: [
        ...cfg.parseWarnings,
        ...skills.parseWarnings,
        ...hooks.parseWarnings,
        ...cmds.parseWarnings,
        ...agents.parseWarnings,
        ...mcp.parseWarnings,
        ...sessions.parseWarnings,
        ...git.skipped,
      ],
      skipped_files: 0,
      elapsed_ms: 0,
    },
    raw: { cfg, skills, hooks, cmds, agents, mcp, sessions, git },
  };
}
