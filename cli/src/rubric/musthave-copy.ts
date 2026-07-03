import type { Confidence } from "../scanner/confidence.js";

/**
 * The minimal shape renderMustHaves needs per missing dimension: enough to
 * name it and explain why it matters. `deriveMusthaves` (index.ts) builds
 * these from rubric.yaml dimension entries (id, name, rationale).
 */
export type MustHaveItem = {
  id: number;
  name: string;
  /** One-line "why it matters" copy, sourced from rubric.yaml's rationale field. */
  rationale: string;
};

export type RenderMustHavesOptions = {
  confidence: Confidence;
};

/**
 * Render musthave items as human-readable "name: reason" lines, never as a
 * raw rubric id (see why.ts for the id-bearing debug format, kept separate).
 *
 * Confidence gate (Task B3 / A4's Confidence type):
 *   - "low": tool-derived detection can't be trusted, so we must not claim
 *     the user is personally missing these things. Render the same items as
 *     an unpersonalized community list, prefixed by a single disclaimer
 *     banner line (once at the top, not per item). With zero items there is
 *     nothing to list, so the banner is omitted too: empty in, empty out.
 *   - "high" or "unknown": personalized claims stand. "unknown" means zero
 *     sessions were found at all (nothing to lose confidence in), so there is
 *     no false-negative risk in naming what's missing.
 */
export function renderMustHaves(
  items: readonly MustHaveItem[],
  { confidence }: RenderMustHavesOptions,
): string[] {
  if (items.length === 0) return [];
  if (confidence === "low") {
    return [
      "Couldn't verify your setup fully. Here's what the community swears by:",
      ...items.map((item) => `${item.name}: ${item.rationale}`),
    ];
  }
  return items.map((item) => `${item.name}: ${item.rationale}`);
}
