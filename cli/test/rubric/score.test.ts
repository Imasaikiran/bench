import { describe, it, expect } from "vitest";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadRubric } from "../../src/rubric/load";
import { scoreFromCounts } from "../../src/rubric/score";
import { inferTier } from "../../src/rubric/persona";

// ABSOLUTE path — survives a future runner that doesn't cwd into cli/.
const rubricPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "rubric",
  "rubric.yaml",
);

const rubric = loadRubric(rubricPath);

describe("scoreFromCounts", () => {
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

// =====================================================================
// Per-chapter exact-score pinning. Locks the weighted-sum + rounding
// contract so any silent change in predicate logic, weight, or rounding
// surfaces here. Source for weights: rubric/rubric.yaml. Source for
// predicate thresholds: cli/src/rubric/score.ts.
// =====================================================================

describe("scoreFromCounts — per-chapter exact scoring", () => {
  it("Foundation: all five predicates fire 'have' → chapter score 100", () => {
    // Foundation weights: 1.0 + 1.0 + 1.0 + 0.8 + 0.4 = 4.2; all have → 100.
    const counts = {
      claude_md_lines: 100, // dim1: in [20,300] → have
      settings_valid: true,
      settings_nonempty: true, // dim2: have
      permissions_allow_count: 5, // dim3: ≥3 → have
      sub_dir_claude_md_count: 1, // dim4: ≥1 → have
      docs_dir_nonempty: true, // dim5: have
    };
    const r = scoreFromCounts(counts, rubric);
    expect(r.chapters.Foundation!.score).toBe(100);
    expect(r.chapters.Foundation!.states).toEqual([
      "have",
      "have",
      "have",
      "have",
      "have",
    ]);
  });

  it("Foundation: all five predicates miss → chapter score 0", () => {
    const counts = {}; // every num() returns NaN, every bool() returns false
    const r = scoreFromCounts(counts, rubric);
    expect(r.chapters.Foundation!.score).toBe(0);
    expect(r.chapters.Foundation!.states).toEqual([
      "missing",
      "missing",
      "missing",
      "missing",
      "missing",
    ]);
  });

  it("Foundation: mixed states pin exact weighted score = 55", () => {
    // dim1 have(1.0*1) + dim2 missing(1.0*0) + dim3 partial(1.0*0.5)
    //  + dim4 have(0.8*1) + dim5 missing(0.4*0) = 2.3 / 4.2 = 54.76 → 55.
    const counts = {
      claude_md_lines: 100, // have
      // settings_valid omitted → missing
      permissions_allow_count: 1, // partial
      sub_dir_claude_md_count: 1, // have
      // docs_dir_nonempty omitted → missing
    };
    const r = scoreFromCounts(counts, rubric);
    expect(r.chapters.Foundation!.states).toEqual([
      "have",
      "missing",
      "partial",
      "have",
      "missing",
    ]);
    expect(r.chapters.Foundation!.score).toBe(55);
  });

  it("Automation: all five predicates fire 'have' → chapter score 100", () => {
    // Automation weights: 1.0 + 1.0 + 0.8 + 0.8 + 0.6 = 4.2
    const counts = {
      post_tool_use_hook: "present", // dim6
      pre_tool_use_hook: "present", // dim7
      session_hook: "present", // dim8
      commands_total: 5, // dim9: ≥3 → have
      automation_events: 250, // dim10: >100 → have
    };
    const r = scoreFromCounts(counts, rubric);
    expect(r.chapters.Automation!.score).toBe(100);
  });

  it("Automation: mixed states pin exact weighted score = 52", () => {
    // dim6 have(1.0*1)=1.0, dim7 partial(1.0*0.5)=0.5, dim8 missing(0.8*0)=0,
    // dim9 partial(0.8*0.5)=0.4, dim10 partial(0.6*0.5)=0.3 → 2.2/4.2 = 52.38 → 52.
    const counts = {
      post_tool_use_hook: "present", // have
      pre_tool_use_hook: "referenced", // partial
      // session_hook omitted → missing
      commands_total: 2, // partial (1–2 range)
      automation_events: 50, // partial (10–100)
    };
    const r = scoreFromCounts(counts, rubric);
    expect(r.chapters.Automation!.states).toEqual([
      "have",
      "partial",
      "missing",
      "partial",
      "partial",
    ]);
    expect(r.chapters.Automation!.score).toBe(52);
  });

  it("Automation: hook scripts on disk but settings empty → partial credit via any_hook_present", () => {
    // Scenario: ~/.claude/hooks/post-tool.sh exists (any_hook_present=true) but
    // settings.json doesn't reference any hooks (post_tool_use_hook etc. unset).
    // Without partial-credit, these would all score "missing". With it, they score
    // "partial" because the user has the pieces but hasn't wired them.
    // dim6 partial(1.0*0.5)=0.5, dim7 partial(1.0*0.5)=0.5, dim8 partial(0.8*0.5)=0.4,
    // dim9 missing(0.8*0)=0, dim10 missing(0.6*0)=0 → 1.4/4.2 = 33.33 → 33.
    const counts = {
      any_hook_present: true,
      // post_tool_use_hook / pre_tool_use_hook / session_hook not set → fallback branch
      commands_total: 0,
      automation_events: 0,
    };
    const r = scoreFromCounts(counts, rubric);
    expect(r.chapters.Automation!.states).toEqual([
      "partial",
      "partial",
      "partial",
      "missing",
      "missing",
    ]);
    expect(r.chapters.Automation!.score).toBe(33);
  });

  it("Coherence: all-have fixture lands chapter score 100", () => {
    // Coherence weights: 0.6 + 0.8 + 1.0 + 0.6 + 0.6 = 3.6
    const counts = {
      project_root_count: 3, // dim21: ≤5 → have
      orphaned_hooks_fraction: 0,
      duplicate_skill_fraction: 0, // dim22: have
      skills_unused_ratio: 0.05, // dim23: ≤0.1 → have
      clean_frontmatter_ratio: 1, // dim24: ==1 → have
      distinct_heading_count: 3, // dim25: ≤5 → have
    };
    const r = scoreFromCounts(counts, rubric);
    expect(r.chapters.Coherence!.score).toBe(100);
  });
});

// =====================================================================
// Total-score invariant: top-level score is round(mean of 5 chapter scores).
// Source: cli/src/rubric/score.ts:163-165.
// =====================================================================

describe("scoreFromCounts — total score invariant", () => {
  it("total score equals round(mean of chapter scores)", () => {
    const counts = {
      claude_md_lines: 180,
      sub_dir_claude_md_count: 1,
      commands_total: 2,
      skills_total: 6,
      skills_unused_ratio: 0.33,
      mcp_servers: 1,
      avg_bytes_per_read: 18000,
      conventional_ratio: 0.6,
      verify_hook_present: true,
      orphaned_hooks_fraction: 0,
      duplicate_skill_fraction: 0,
      clean_frontmatter_ratio: 0.9,
      distinct_heading_count: 4,
      project_root_count: 4,
    };
    const r = scoreFromCounts(counts, rubric);
    const sumOfChapters = Object.values(r.chapters).reduce((a, c) => a + c.score, 0);
    expect(r.score).toBe(Math.round(sumOfChapters / 5));
  });

  it("all-zero input lands total score 0 across all chapters", () => {
    const r = scoreFromCounts({}, rubric);
    for (const c of Object.values(r.chapters)) expect(c.score).toBe(0);
    expect(r.score).toBe(0);
  });

  it("all-have input lands total score 100 across all chapters", () => {
    const counts = {
      // Foundation
      claude_md_lines: 100,
      settings_valid: true,
      settings_nonempty: true,
      permissions_allow_count: 5,
      sub_dir_claude_md_count: 2,
      docs_dir_nonempty: true,
      // Automation
      post_tool_use_hook: "present",
      pre_tool_use_hook: "present",
      session_hook: "present",
      commands_total: 5,
      automation_events: 250,
      // Delegation
      skills_total: 8,
      skills_unused_ratio: 0.05,
      mcp_has_github: true,
      mcp_servers: 2,
      review_agent: true,
      test_agent: true,
      agents_configured: 4,
      // Craft
      plan_mode_ratio: 0.5,
      avg_bytes_per_read: 10000,
      worktrees_detected: 2,
      conventional_ratio: 0.95,
      verify_hook_present: true,
      // Coherence
      project_root_count: 3,
      orphaned_hooks_fraction: 0,
      duplicate_skill_fraction: 0,
      clean_frontmatter_ratio: 1,
      distinct_heading_count: 3,
    };
    const r = scoreFromCounts(counts, rubric);
    for (const c of Object.values(r.chapters)) expect(c.score).toBe(100);
    expect(r.score).toBe(100);
  });
});

// =====================================================================
// Determinism: the scorer is a pure function. Same input → same output.
// =====================================================================

describe("scoreFromCounts — determinism", () => {
  it("same input produces same output across repeated calls", () => {
    const counts = {
      claude_md_lines: 180,
      sub_dir_claude_md_count: 1,
      commands_total: 2,
      skills_total: 6,
      skills_unused_ratio: 0.33,
      mcp_servers: 1,
      avg_bytes_per_read: 18000,
      conventional_ratio: 0.6,
      verify_hook_present: true,
      orphaned_hooks_fraction: 0,
      duplicate_skill_fraction: 0,
      clean_frontmatter_ratio: 0.9,
      distinct_heading_count: 4,
      project_root_count: 4,
    };
    const r1 = scoreFromCounts(counts, rubric);
    const r2 = scoreFromCounts(counts, rubric);
    expect(r2).toEqual(r1);
  });
});

// =====================================================================
// Empty / degenerate inputs. Document the contract: an empty counts
// object produces score 0, all "missing" states, and tier Explorer.
// =====================================================================

describe("scoreFromCounts — empty / degenerate inputs", () => {
  it("empty counts object → score 0, all states missing, tier Explorer", () => {
    const r = scoreFromCounts({}, rubric);
    expect(r.score).toBe(0);
    const allStates = Object.values(r.chapters).flatMap((c) => c.states);
    expect(allStates).toHaveLength(25);
    expect(allStates.every((s) => s === "missing")).toBe(true);
    expect(inferTier({})).toBe("Explorer");
  });

  it("non-numeric numeric fields are treated as missing (NaN-safe)", () => {
    const counts = {
      claude_md_lines: "180" as unknown as number, // string, not number
      commands_total: null as unknown as number,
      automation_events: undefined as unknown as number,
      skills_total: NaN,
    };
    const r = scoreFromCounts(counts, rubric);
    expect(r.chapters.Foundation!.states[0]).toBe("missing");
    expect(r.chapters.Automation!.states[3]).toBe("missing"); // commands_total
    expect(r.chapters.Automation!.states[4]).toBe("missing"); // automation_events
    expect(r.chapters.Delegation!.states[0]).toBe("missing"); // skills_total
  });
});

// =====================================================================
// Tier boundaries. Pin each tier with a fixture that hits the threshold,
// plus a one-step-below fixture that drops to the next-lower tier.
// Source for thresholds: docs/specs/2026-04-25-bench-v2-design.md §5.4
// (lines 420-439) and cli/src/rubric/persona.ts:21-54.
// =====================================================================

describe("inferTier — tier boundaries", () => {
  it("Explorer: weeks_on_cc < 4 short-circuits regardless of other counts", () => {
    expect(inferTier({ weeks_on_cc: 3, sessions_total: 100, skills_total: 5 })).toBe(
      "Explorer",
    );
  });

  it("Explorer: sessions_total < 20 short-circuits", () => {
    expect(inferTier({ weeks_on_cc: 20, sessions_total: 19, skills_total: 5 })).toBe(
      "Explorer",
    );
  });

  // ---- Tinkerer boundary (weeks≥4, sessions≥20, skills_total≥2,
  //       skills_unused_ratio>0.1) ----

  it("Tinkerer: at threshold (weeks=4, sessions=20, skills=2, ratio=0.11)", () => {
    expect(
      inferTier({
        weeks_on_cc: 4,
        sessions_total: 20,
        skills_total: 2,
        skills_unused_ratio: 0.11,
      }),
    ).toBe("Tinkerer");
  });

  it("Tinkerer→Explorer: skills_unused_ratio = 0.1 fails strict > and drops to Explorer", () => {
    // Quirk note: ratio uses strict > 0.1, so a perfectly pruned setup with
    // weeks=4, sessions=20, skills=2 and ratio=0.10 is classified Explorer.
    expect(
      inferTier({
        weeks_on_cc: 4,
        sessions_total: 20,
        skills_total: 2,
        skills_unused_ratio: 0.1,
      }),
    ).toBe("Explorer");
  });

  it("Tinkerer→Explorer: skills_total=1 misses Tinkerer's skills≥2 floor", () => {
    expect(
      inferTier({
        weeks_on_cc: 10,
        sessions_total: 50,
        skills_total: 1,
        skills_unused_ratio: 0.5,
      }),
    ).toBe("Explorer");
  });

  // ---- Craftsman boundary (weeks≥12, skills_total≥3,
  //       skills_unused_ratio≤0.15, plan_mode_ratio≥0.25,
  //       coherence_score≥0.6) ----

  it("Craftsman: at threshold (weeks=12, skills=3, ratio=0.15, plan=0.25, coh=0.6)", () => {
    expect(
      inferTier({
        weeks_on_cc: 12,
        sessions_total: 100,
        skills_total: 3,
        skills_unused_ratio: 0.15,
        plan_mode_ratio: 0.25,
        coherence_score: 0.6,
      }),
    ).toBe("Craftsman");
  });

  it("Craftsman→Tinkerer: weeks=11 (one below) drops to Tinkerer", () => {
    // weeks=11 fails Craftsman's weeks≥12 but the upstream Tinkerer
    // conditions still pass (weeks≥4, sessions≥20, skills≥2, ratio>0.1).
    // Use ratio=0.2 so it's >0.1 (Tinkerer) but >0.15 (so Craftsman fails
    // independently too — we're isolating the weeks check).
    expect(
      inferTier({
        weeks_on_cc: 11,
        sessions_total: 100,
        skills_total: 3,
        skills_unused_ratio: 0.2,
        plan_mode_ratio: 0.25,
        coherence_score: 0.6,
      }),
    ).toBe("Tinkerer");
  });

  it("Craftsman→Tinkerer: plan_mode_ratio=0.24 (one tick below) drops to Tinkerer", () => {
    expect(
      inferTier({
        weeks_on_cc: 12,
        sessions_total: 100,
        skills_total: 3,
        skills_unused_ratio: 0.12, // >0.1 keeps Tinkerer alive
        plan_mode_ratio: 0.24,
        coherence_score: 0.6,
      }),
    ).toBe("Tinkerer");
  });

  // ---- Operator boundary (weeks≥16, agents≥2, hooks≥3,
  //       automation_events≥300, coherence_score≥0.75) ----

  it("Operator: at threshold (weeks=16, agents=2, hooks=3, events=300, coh=0.75)", () => {
    expect(
      inferTier({
        weeks_on_cc: 16,
        sessions_total: 200,
        skills_total: 4,
        skills_unused_ratio: 0.1,
        plan_mode_ratio: 0.3,
        coherence_score: 0.75,
        agents_configured: 2,
        hooks_configured: 3,
        automation_events: 300,
      }),
    ).toBe("Operator");
  });

  it("Operator→Craftsman: automation_events=299 (one below) drops to Craftsman", () => {
    expect(
      inferTier({
        weeks_on_cc: 16,
        sessions_total: 200,
        skills_total: 4,
        skills_unused_ratio: 0.1,
        plan_mode_ratio: 0.3,
        coherence_score: 0.75,
        agents_configured: 2,
        hooks_configured: 3,
        automation_events: 299,
      }),
    ).toBe("Craftsman");
  });

  it("Operator→Craftsman: coherence_score=0.74 (just below) drops to Craftsman", () => {
    expect(
      inferTier({
        weeks_on_cc: 16,
        sessions_total: 200,
        skills_total: 4,
        skills_unused_ratio: 0.1,
        plan_mode_ratio: 0.3,
        coherence_score: 0.74,
        agents_configured: 2,
        hooks_configured: 3,
        automation_events: 300,
      }),
    ).toBe("Craftsman");
  });

  // ---- Conductor boundary (all Operator + cross_consistency≥0.7,
  //       skills≥5, skills_unused_ratio≤0.1, sub_dir_claude_md≥2,
  //       commit_burst_correlation≥0.4) ----

  it("Conductor: at threshold across all five extra conditions", () => {
    expect(
      inferTier({
        weeks_on_cc: 16,
        sessions_total: 200,
        skills_total: 5,
        skills_unused_ratio: 0.1,
        plan_mode_ratio: 0.3,
        coherence_score: 0.75,
        agents_configured: 2,
        hooks_configured: 3,
        automation_events: 300,
        cross_project_consistency_score: 0.7,
        sub_dir_claude_md_count: 2,
        commit_burst_correlation: 0.4,
      }),
    ).toBe("Conductor");
  });

  it("Conductor→Operator: sub_dir_claude_md_count=1 (one below) drops to Operator", () => {
    expect(
      inferTier({
        weeks_on_cc: 16,
        sessions_total: 200,
        skills_total: 5,
        skills_unused_ratio: 0.1,
        plan_mode_ratio: 0.3,
        coherence_score: 0.75,
        agents_configured: 2,
        hooks_configured: 3,
        automation_events: 300,
        cross_project_consistency_score: 0.7,
        sub_dir_claude_md_count: 1, // below Conductor's ≥2
        commit_burst_correlation: 0.4,
      }),
    ).toBe("Operator");
  });

  it("Conductor→Operator: commit_burst_correlation=0.39 (one tick below) drops to Operator", () => {
    expect(
      inferTier({
        weeks_on_cc: 16,
        sessions_total: 200,
        skills_total: 5,
        skills_unused_ratio: 0.1,
        plan_mode_ratio: 0.3,
        coherence_score: 0.75,
        agents_configured: 2,
        hooks_configured: 3,
        automation_events: 300,
        cross_project_consistency_score: 0.7,
        sub_dir_claude_md_count: 2,
        commit_burst_correlation: 0.39,
      }),
    ).toBe("Operator");
  });
});
