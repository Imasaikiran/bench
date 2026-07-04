import { readFileSync } from "node:fs";

/**
 * Bundled "of N public setups benchmarked" reference table (Task D1). Ships
 * with an honest empty state (denominator 0, no dimensions) until the
 * founder scores real public setups during Phase E launch prep — see
 * rubric/prevalence.json. NEVER fabricate percentages here or in the seed
 * file; pickHeadlineRarity must degrade to null when the table is empty.
 */
export type PrevalenceTable = {
  denominator: number;
  denominator_label: string;
  dimensions: Record<string, number>; // dimension id (string form) -> count that have it
};

// Below this many benchmarked setups, a percentage is statistical noise
// (e.g. 1-in-15 reads as a dramatic "7%" that's really just one person).
// Refuse to surface a headline until the sample is large enough to mean
// something.
export const MIN_DENOMINATOR = 20;

// A "you do" flex about something most setups already have isn't a flex.
// Only surface a dimension if fewer than roughly a quarter of benchmarked
// setups have it.
export const RARITY_CEILING_PCT = 25;

export function loadPrevalenceTable(path: string): PrevalenceTable {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as PrevalenceTable;
  return parsed;
}

/**
 * Picks the user's rarest qualifying strength and formats it as a
 * humblebrag-cover line, e.g.:
 *   "Only 9% of 50 public setups benchmarked have a PreToolUse hook. You do."
 *
 * Returns null when the table is unpopulated (below MIN_DENOMINATOR), the
 * user has no qualifying strengths, or none of the user's haves appear in
 * the table / are rare enough (<= RARITY_CEILING_PCT) to be notable.
 */
export function pickHeadlineRarity(
  userHaveDimensionIds: readonly number[],
  dimensionNames: ReadonlyMap<number, string>,
  table: PrevalenceTable,
): string | null {
  if (table.denominator < MIN_DENOMINATOR) return null;
  if (userHaveDimensionIds.length === 0) return null;

  let bestId: number | null = null;
  let bestCount = Infinity;

  for (const id of userHaveDimensionIds) {
    const count = table.dimensions[String(id)];
    if (count === undefined) continue;

    const pct = (count / table.denominator) * 100;
    if (pct > RARITY_CEILING_PCT) continue;

    if (
      count < bestCount ||
      (count === bestCount && bestId !== null && id < bestId)
    ) {
      bestCount = count;
      bestId = id;
    }
  }

  if (bestId === null) return null;

  const name = dimensionNames.get(bestId);
  if (!name) return null;

  const rawPct = (bestCount / table.denominator) * 100;
  const pct = Math.max(1, Math.round(rawPct));

  return `Only ${pct}% of ${table.denominator} ${table.denominator_label} have a ${name}. You do.`;
}
