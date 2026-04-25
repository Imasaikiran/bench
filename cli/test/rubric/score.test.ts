import { describe, it, expect } from "vitest";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadRubric } from "../../src/rubric/load";
import { scoreFromCounts } from "../../src/rubric/score";

// ABSOLUTE path — survives a future runner that doesn't cwd into cli/.
const rubricPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "rubric",
  "rubric.yaml",
);

describe("scoreFromCounts", () => {
  const rubric = loadRubric(rubricPath);
  it("produces 5 chapter scores and 25 states", () => {
    const counts = {
      sessions_total: 100,
      plan_mode_sessions: 25,
      skills_total: 6,
      skills_active: 4,
      skills_unused_ratio: 0.33,
      hooks_configured: 0,
      agents_configured: 0,
      commands_total: 2,
      mcp_servers: 1,
      automation_events: 0,
      claude_md_lines: 180,
      sub_dir_claude_md_count: 1,
      coherence_score: 0.72,
      commit_burst_correlation: 0.3,
      weeks_on_cc: 14,
      active_hours_total: 187,
      avg_bytes_per_read: 18000,
      worktrees_detected: 0,
      duplicate_skill_fraction: 0,
      orphaned_hooks_fraction: 0,
      conventional_ratio: 0.6,
      clean_frontmatter_ratio: 0.9,
      distinct_heading_count: 4,
      project_root_count: 4,
      verify_hook_present: true,
    };
    const r = scoreFromCounts(counts, rubric);
    expect(Object.keys(r.chapters).sort()).toEqual([
      "Automation",
      "Coherence",
      "Craft",
      "Delegation",
      "Foundation",
    ]);
    const allStates = Object.values(r.chapters).flatMap((c) => c.states);
    expect(allStates).toHaveLength(25);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});
