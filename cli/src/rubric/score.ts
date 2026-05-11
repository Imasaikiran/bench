import type { Rubric } from "./load.js";

export type State = "have" | "partial" | "missing";
export type Counts = Record<string, unknown>;

// Helpers for safe comparisons under noUncheckedIndexedAccess + unknown counts.
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : NaN);
const bool = (v: unknown): boolean => v === true;

const PREDICATES: Record<number, (c: Counts) => State> = {
  1: (c) => {
    const n = num(c.claude_md_lines);
    return n >= 20 && n <= 300 ? "have" : n > 0 ? "partial" : "missing";
  },
  2: (c) =>
    bool(c.settings_valid) && bool(c.settings_nonempty)
      ? "have"
      : bool(c.settings_valid)
        ? "partial"
        : "missing",
  3: (c) => {
    const n = num(c.permissions_allow_count);
    return n >= 3 ? "have" : n >= 1 ? "partial" : "missing";
  },
  4: (c) => (num(c.sub_dir_claude_md_count) >= 1 ? "have" : "missing"),
  5: (c) => (bool(c.docs_dir_nonempty) ? "have" : "missing"),
  6: (c) =>
    c.post_tool_use_hook === "present"
      ? "have"
      : c.post_tool_use_hook === "referenced"
        ? "partial"
        : bool(c.any_hook_present)
          ? "partial"
          : "missing",
  7: (c) =>
    c.pre_tool_use_hook === "present"
      ? "have"
      : c.pre_tool_use_hook === "referenced"
        ? "partial"
        : bool(c.any_hook_present)
          ? "partial"
          : "missing",
  8: (c) =>
    c.session_hook === "present"
      ? "have"
      : c.session_hook === "referenced"
        ? "partial"
        : bool(c.any_hook_present)
          ? "partial"
          : "missing",
  9: (c) => {
    const n = num(c.commands_total);
    return n >= 3 ? "have" : n >= 1 ? "partial" : "missing";
  },
  10: (c) => {
    const n = num(c.automation_events);
    return n > 100 ? "have" : n >= 10 ? "partial" : "missing";
  },
  11: (c) => {
    const n = num(c.skills_total);
    return n >= 3 ? "have" : n >= 1 ? "partial" : "missing";
  },
  12: (c) => {
    const n = num(c.skills_unused_ratio);
    return n <= 0.15 ? "have" : n <= 0.3 ? "partial" : "missing";
  },
  13: (c) =>
    bool(c.mcp_has_github)
      ? "have"
      : num(c.mcp_servers) >= 1
        ? "partial"
        : "missing",
  14: (c) =>
    bool(c.review_agent)
      ? "have"
      : num(c.agents_configured) >= 1
        ? "partial"
        : "missing",
  15: (c) =>
    bool(c.test_agent)
      ? "have"
      : num(c.agents_configured) >= 1
        ? "partial"
        : "missing",
  16: (c) => {
    const n = num(c.plan_mode_ratio);
    return n >= 0.25 ? "have" : n >= 0.05 ? "partial" : "missing";
  },
  17: (c) => {
    const n = num(c.avg_bytes_per_read);
    return n > 0 && n <= 20000
      ? "have"
      : n > 0 && n <= 60000
        ? "partial"
        : "missing";
  },
  18: (c) => (num(c.worktrees_detected) >= 1 ? "have" : "missing"),
  19: (c) => {
    const n = num(c.conventional_ratio);
    return n >= 0.8 ? "have" : n >= 0.5 ? "partial" : "missing";
  },
  20: (c) =>
    bool(c.verify_hook_present)
      ? "have"
      : bool(c.any_hook_present)
        ? "partial"
        : "missing",
  21: (c) => {
    const n = num(c.project_root_count);
    return n <= 5 ? "have" : n <= 10 ? "partial" : "missing";
  },
  22: (c) =>
    num(c.orphaned_hooks_fraction) === 0 && num(c.duplicate_skill_fraction) === 0
      ? "have"
      : num(c.orphaned_hooks_fraction) < 0.2
        ? "partial"
        : "missing",
  23: (c) => {
    const n = num(c.skills_unused_ratio);
    return n <= 0.1 ? "have" : n <= 0.25 ? "partial" : "missing";
  },
  24: (c) =>
    num(c.clean_frontmatter_ratio) === 1
      ? "have"
      : num(c.clean_frontmatter_ratio) >= 0.8
        ? "partial"
        : "missing",
  25: (c) => {
    const n = num(c.distinct_heading_count);
    return n <= 5 ? "have" : n <= 10 ? "partial" : "missing";
  },
};

const STATE_VAL: Record<State, number> = { have: 1, partial: 0.5, missing: 0 };

export type ChapterResult = { score: number; states: State[] };
export type ScoreResult = { chapters: Record<string, ChapterResult>; score: number };

const CHAPTER_NAMES = ["Foundation", "Automation", "Delegation", "Craft", "Coherence"] as const;

export function scoreFromCounts(counts: Counts, rubric: Rubric): ScoreResult {
  const out: Record<string, ChapterResult> = {};
  for (const name of CHAPTER_NAMES) {
    const chapter = rubric.chapters[name];
    if (!chapter) throw new Error(`scoreFromCounts: missing chapter "${name}" in rubric`);
    const dims = chapter.dimensions;
    const states: State[] = dims.map((d) => {
      const fn = PREDICATES[d.id];
      if (!fn) throw new Error(`scoreFromCounts: no predicate for dimension id ${d.id}`);
      return fn(counts);
    });
    let weighted = 0,
      weightSum = 0;
    for (let i = 0; i < dims.length; i++) {
      const d = dims[i]!;
      const s = states[i]!;
      weighted += d.weight * STATE_VAL[s];
      weightSum += d.weight;
    }
    const score = weightSum === 0 ? 0 : Math.round((weighted / weightSum) * 100);
    out[name] = { score, states };
  }
  let totalScore = 0;
  for (const name of CHAPTER_NAMES) totalScore += out[name]!.score;
  const score = Math.round(totalScore / CHAPTER_NAMES.length);
  return { chapters: out, score };
}
