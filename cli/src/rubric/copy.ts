import { pickVerbs } from "./verbs.js";

// matches persona.ts HOURS_FLOOR — kept local per plan §1992 so copy.ts stays self-contained.
const HOURS_FLOOR = 5;

/**
 * Convert a verb to its gerund (verb-ing) form, handling common English rules:
 *   - "update" → "updating"  (silent-e drop)
 *   - "die"    → "dying"     (ie → ying)
 *   - "run"    → "running"   (CVC consonant double, intentionally NOT handled
 *                              — too many exceptions; ship the simple cases)
 *   - "build"  → "building"  (default: just append "ing")
 *
 * Exported for compatibility; no longer used internally by deriveCopy (see B2).
 */
export function gerundize(verb: string): string {
  if (/ie$/i.test(verb)) return verb.slice(0, -2) + "ying";
  if (/[^aeiou]e$/i.test(verb)) return verb.slice(0, -1) + "ing";
  return verb + "ing";
}

export type CopyContext = {
  signatureVerbs?: readonly string[];
  hours_with_cc?: number | null;
  skillsTotal?: number;
  projectRoots?: number;
  sessionsTotal?: number;
  weeksOnCc?: number;
  planModeRatio?: number;
};

export type DerivedCopy = {
  signature_verbs: string[];
  identity: string;
  hours_meaning: string;
  hours_label: string;
};

export function deriveCopy(ctx: CopyContext): DerivedCopy {
  const verbs = pickVerbs(ctx.signatureVerbs ?? []).slice(0, 3);
  const skills = ctx.skillsTotal ?? 0;
  const roots = ctx.projectRoots ?? 0;
  const sessions = ctx.sessionsTotal ?? 0;
  const weeks = ctx.weeksOnCc ?? 0;
  const planRatio = ctx.planModeRatio ?? 0;

  // Build up to two evidence clauses, strongest first. Each is a true, checkable
  // statement. If none qualify, fall back to a verb line (whitelisted) or a stub.
  // Invariant: clauses must start lowercase and carry no trailing period; the
  // join step below capitalizes each and adds the periods.
  const clauses: string[] = [];
  if (skills >= 20 && roots >= 5) {
    clauses.push(`${skills} skills installed across ${roots} projects: you collect capability faster than you spend it`);
  } else if (sessions >= 20 && weeks >= 2) {
    clauses.push(`${sessions} sessions in ${weeks} weeks: this is a daily tool for you, not an experiment`);
  }
  if (planRatio >= 0.25) {
    clauses.push(`you plan before you build`);
  } else if (verbs.length >= 1) {
    clauses.push(`you ${verbs[0]!} more than anything else`);
  }

  let identity: string;
  if (clauses.length > 0) {
    identity = clauses.map((c) => c[0]!.toUpperCase() + c.slice(1)).join(". ") + ".";
  } else if (verbs.length >= 1) {
    identity = `You ${verbs[0]!}.`;
  } else {
    identity = "Early days. Come back after a few more sessions.";
  }

  const h = typeof ctx.hours_with_cc === "number" && Number.isFinite(ctx.hours_with_cc) ? ctx.hours_with_cc : 0;
  const workdays = Math.round(h / 8);
  const hours_meaning =
    h >= HOURS_FLOOR
      ? `~${workdays} workdays of pair-programming — whatever you made, you made it together`
      : "";

  return { signature_verbs: verbs, identity, hours_meaning, hours_label: "hours with Claude Code" };
}
