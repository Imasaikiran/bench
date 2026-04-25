// matches persona.ts HOURS_FLOOR — kept local per plan §1992 so copy.ts stays self-contained.
const HOURS_FLOOR = 5;

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
      ? `You ${v0} to learn. You ${verbs[1]!} to focus. You keep ${verbs[2]!}ing if it fits.`
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
