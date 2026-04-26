/**
 * Server-side re-score engine.
 * Ported from cli/src/rubric/{load,score,persona}.ts — workspace boundaries
 * prevent direct imports, so this is a faithful copy kept in sync manually.
 * Any predicate change in cli/src/rubric/score.ts must be mirrored here.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { load as yamlLoad } from "js-yaml";

// ---------------------------------------------------------------------------
// Types (mirrored from cli/src/rubric/load.ts + score.ts + persona.ts)
// ---------------------------------------------------------------------------

type RubricDimension = {
  id: number;
  name: string;
  weight: number;
};

type RubricChapter = {
  dimensions: RubricDimension[];
};

type Rubric = {
  version: string;
  chapters: Record<string, RubricChapter>;
  [key: string]: unknown;
};

export type State = "have" | "partial" | "missing";
export type Counts = Record<string, unknown>;
export type Tier = "Explorer" | "Tinkerer" | "Craftsman" | "Operator" | "Conductor";

export type RescoreResult = {
  score: number;
  tier: Tier;
  chapters: Record<
    "Foundation" | "Automation" | "Delegation" | "Craft" | "Coherence",
    { score: number; states: State[] }
  >;
  rubricVersion: string;
};

// ---------------------------------------------------------------------------
// Rubric load (cached at module load time)
// ---------------------------------------------------------------------------

function loadRubric(): Rubric {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const path = resolve(__dirname, "../../rubric/rubric.yaml");
  const parsed = yamlLoad(readFileSync(path, "utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`loadRubric: did not parse to an object`);
  }
  return parsed as Rubric;
}

const rubric = loadRubric();

// ---------------------------------------------------------------------------
// Predicates (mirrored from cli/src/rubric/score.ts)
// ---------------------------------------------------------------------------

const num = (v: unknown): number =>
  typeof v === "number" && Number.isFinite(v) ? v : NaN;
const bool = (v: unknown): boolean => v === true;

const PREDICATES: Record<number, (c: Counts) => State> = {
  1: (c) => {
    const n = num(c["claude_md_lines"]);
    return n >= 20 && n <= 300 ? "have" : n > 0 ? "partial" : "missing";
  },
  2: (c) =>
    bool(c["settings_valid"]) && bool(c["settings_nonempty"])
      ? "have"
      : bool(c["settings_valid"])
        ? "partial"
        : "missing",
  3: (c) => {
    const n = num(c["permissions_allow_count"]);
    return n >= 3 ? "have" : n >= 1 ? "partial" : "missing";
  },
  4: (c) => (num(c["sub_dir_claude_md_count"]) >= 1 ? "have" : "missing"),
  5: (c) => (bool(c["docs_dir_nonempty"]) ? "have" : "missing"),
  6: (c) =>
    c["post_tool_use_hook"] === "present"
      ? "have"
      : c["post_tool_use_hook"] === "referenced"
        ? "partial"
        : "missing",
  7: (c) =>
    c["pre_tool_use_hook"] === "present"
      ? "have"
      : c["pre_tool_use_hook"] === "referenced"
        ? "partial"
        : "missing",
  8: (c) =>
    c["session_hook"] === "present"
      ? "have"
      : c["session_hook"] === "referenced"
        ? "partial"
        : "missing",
  9: (c) => {
    const n = num(c["commands_total"]);
    return n >= 3 ? "have" : n >= 1 ? "partial" : "missing";
  },
  10: (c) => {
    const n = num(c["automation_events"]);
    return n > 100 ? "have" : n >= 10 ? "partial" : "missing";
  },
  11: (c) => {
    const n = num(c["skills_total"]);
    return n >= 3 ? "have" : n >= 1 ? "partial" : "missing";
  },
  12: (c) => {
    const n = num(c["skills_unused_ratio"]);
    return n <= 0.15 ? "have" : n <= 0.3 ? "partial" : "missing";
  },
  13: (c) =>
    bool(c["mcp_has_github"])
      ? "have"
      : num(c["mcp_servers"]) >= 1
        ? "partial"
        : "missing",
  14: (c) =>
    bool(c["review_agent"])
      ? "have"
      : num(c["agents_configured"]) >= 1
        ? "partial"
        : "missing",
  15: (c) =>
    bool(c["test_agent"])
      ? "have"
      : num(c["agents_configured"]) >= 1
        ? "partial"
        : "missing",
  16: (c) => {
    const n = num(c["plan_mode_ratio"]);
    return n >= 0.25 ? "have" : n >= 0.05 ? "partial" : "missing";
  },
  17: (c) => {
    const n = num(c["avg_bytes_per_read"]);
    return n > 0 && n <= 20000
      ? "have"
      : n > 0 && n <= 60000
        ? "partial"
        : "missing";
  },
  18: (c) => (num(c["worktrees_detected"]) >= 1 ? "have" : "missing"),
  19: (c) => {
    const n = num(c["conventional_ratio"]);
    return n >= 0.8 ? "have" : n >= 0.5 ? "partial" : "missing";
  },
  20: (c) =>
    bool(c["verify_hook_present"])
      ? "have"
      : bool(c["any_hook_present"])
        ? "partial"
        : "missing",
  21: (c) => {
    const n = num(c["project_root_count"]);
    return n <= 5 ? "have" : n <= 10 ? "partial" : "missing";
  },
  22: (c) =>
    num(c["orphaned_hooks_fraction"]) === 0 &&
    num(c["duplicate_skill_fraction"]) === 0
      ? "have"
      : num(c["orphaned_hooks_fraction"]) < 0.2
        ? "partial"
        : "missing",
  23: (c) => {
    const n = num(c["skills_unused_ratio"]);
    return n <= 0.1 ? "have" : n <= 0.25 ? "partial" : "missing";
  },
  24: (c) =>
    num(c["clean_frontmatter_ratio"]) === 1
      ? "have"
      : num(c["clean_frontmatter_ratio"]) >= 0.8
        ? "partial"
        : "missing",
  25: (c) => {
    const n = num(c["distinct_heading_count"]);
    return n <= 5 ? "have" : n <= 10 ? "partial" : "missing";
  },
};

const STATE_VAL: Record<State, number> = { have: 1, partial: 0.5, missing: 0 };

const CHAPTER_NAMES = [
  "Foundation",
  "Automation",
  "Delegation",
  "Craft",
  "Coherence",
] as const;

// ---------------------------------------------------------------------------
// Tier inference (mirrored from cli/src/rubric/persona.ts)
// ---------------------------------------------------------------------------

function isTinkerer(c: Counts): boolean {
  return (
    num(c["weeks_on_cc"]) >= 4 &&
    num(c["sessions_total"]) >= 20 &&
    num(c["skills_total"]) >= 2 &&
    num(c["skills_unused_ratio"]) > 0.1
  );
}

function isCraftsman(c: Counts): boolean {
  return (
    num(c["weeks_on_cc"]) >= 12 &&
    num(c["skills_total"]) >= 3 &&
    num(c["skills_unused_ratio"]) <= 0.15 &&
    num(c["plan_mode_ratio"]) >= 0.25 &&
    num(c["coherence_score"]) >= 0.6
  );
}

function isOperator(c: Counts): boolean {
  return (
    num(c["weeks_on_cc"]) >= 16 &&
    num(c["agents_configured"]) >= 2 &&
    num(c["hooks_configured"]) >= 3 &&
    num(c["automation_events"]) >= 300 &&
    num(c["coherence_score"]) >= 0.75
  );
}

function isConductor(c: Counts): boolean {
  return (
    isOperator(c) &&
    num(c["cross_project_consistency_score"]) >= 0.7 &&
    num(c["skills_total"]) >= 5 &&
    num(c["skills_unused_ratio"]) <= 0.1 &&
    num(c["sub_dir_claude_md_count"]) >= 2 &&
    num(c["commit_burst_correlation"]) >= 0.4
  );
}

function inferTier(c: Counts): Tier {
  if (isConductor(c)) return "Conductor";
  if (isOperator(c)) return "Operator";
  if (isCraftsman(c)) return "Craftsman";
  if (isTinkerer(c)) return "Tinkerer";
  return "Explorer";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function reScoreFromCounts(counts: Record<string, unknown>): RescoreResult {
  const out: Record<string, { score: number; states: State[] }> = {};

  for (const name of CHAPTER_NAMES) {
    const chapter = rubric.chapters[name];
    if (!chapter) throw new Error(`reScoreFromCounts: missing chapter "${name}" in rubric`);
    const dims = chapter.dimensions;
    const states: State[] = dims.map((d) => {
      const fn = PREDICATES[d.id];
      if (!fn) throw new Error(`reScoreFromCounts: no predicate for dimension id ${d.id}`);
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

  return {
    score,
    tier: inferTier(counts),
    chapters: out as RescoreResult["chapters"],
    rubricVersion: rubric.version,
  };
}
