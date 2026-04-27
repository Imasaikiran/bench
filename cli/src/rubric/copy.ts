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
 * Exported for unit-testing; not part of the public CopyContext API.
 */
export function gerundize(verb: string): string {
  if (/ie$/i.test(verb)) return verb.slice(0, -2) + "ying";
  if (/[^aeiou]e$/i.test(verb)) return verb.slice(0, -1) + "ing";
  return verb + "ing";
}

export type CopyContext = {
  signatureVerbs?: readonly string[];
  hours_with_cc?: number | null;
};

export type DerivedCopy = {
  signature_verbs: string[];
  identity: string;
  hours_meaning: string;
  hours_label: string;
};

export function deriveCopy(ctx: CopyContext): DerivedCopy {
  const verbs = (ctx.signatureVerbs && ctx.signatureVerbs.length > 0
    ? [...ctx.signatureVerbs]
    : ["build"]  // Explorer-tier default verb when no git history available
  ).slice(0, 3);

  const h =
    typeof ctx.hours_with_cc === "number" && Number.isFinite(ctx.hours_with_cc)
      ? ctx.hours_with_cc
      : 0;
  const workdays = Math.round(h / 8);

  // safe: fallback ["build"] above ensures verbs.length >= 1
  const v0 = verbs[0]!;
  const identity =
    verbs.length === 3
      ? `You ${v0} to learn. You ${verbs[1]!} to focus. You keep ${gerundize(verbs[2]!)} if it fits.`
      : `You ${v0}.`;

  const hours_meaning =
    h >= HOURS_FLOOR
      ? `~${workdays} workdays of pair-programming — whatever you made, you made it together`
      : "";

  return {
    signature_verbs: verbs,
    identity,
    hours_meaning,
    hours_label: "hours with Claude Code",
  };
}
