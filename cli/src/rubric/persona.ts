// 3120h = 60h/week × 52 weeks; upper bound on plausible human desk-hours/year.
// Plan §1900 / §5.3. Do NOT lower this constant — it is load-bearing.
export const HOURS_CAP = 3120;
export const HOURS_FLOOR = 5;

/** Returns null when below HOURS_FLOOR (5h) or input is non-finite. */
export function computeHoursWithCc(activeSecondsTotal: number): number | null {
  if (!Number.isFinite(activeSecondsTotal)) return null;
  const h = Math.round(activeSecondsTotal / 3600);
  if (h < HOURS_FLOOR) return null;
  return Math.min(h, HOURS_CAP);
}

export type Tier = "Explorer" | "Tinkerer" | "Craftsman" | "Operator" | "Conductor";
export type Counts = Record<string, unknown>;

// Helper for safe comparisons under noUncheckedIndexedAccess + unknown counts.
// Returns NaN for missing/non-numeric fields so all comparisons safely fail.
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : NaN);

function isTinkerer(c: Counts): boolean {
  return num(c.weeks_on_cc) >= 4
    && num(c.sessions_total) >= 20
    && num(c.skills_total) >= 2
    && num(c.skills_unused_ratio) > 0.1;
}

function isCraftsman(c: Counts): boolean {
  return num(c.weeks_on_cc) >= 12
    && num(c.skills_total) >= 3
    && num(c.skills_unused_ratio) <= 0.15
    && num(c.plan_mode_ratio) >= 0.25
    && num(c.coherence_score) >= 0.6;
}

function isOperator(c: Counts): boolean {
  return num(c.weeks_on_cc) >= 16
    && num(c.agents_configured) >= 2
    && num(c.hooks_configured) >= 3
    && num(c.automation_events) >= 300
    && num(c.coherence_score) >= 0.75;
}

// TODO(1.10+): cross_project_consistency_score / commit_burst_correlation /
// sub_dir_claude_md_count are not yet derived in scan() — Conductor
// classification stays dormant until those upstream signals land.
function isConductor(c: Counts): boolean {
  return isOperator(c)
    && num(c.cross_project_consistency_score) >= 0.7
    && num(c.skills_total) >= 5
    && num(c.skills_unused_ratio) <= 0.1
    && num(c.sub_dir_claude_md_count) >= 2
    && num(c.commit_burst_correlation) >= 0.4;
}

export function inferTier(c: Counts): Tier {
  if (isConductor(c)) return "Conductor";
  if (isOperator(c)) return "Operator";
  if (isCraftsman(c)) return "Craftsman";
  if (isTinkerer(c)) return "Tinkerer";
  return "Explorer";
}
