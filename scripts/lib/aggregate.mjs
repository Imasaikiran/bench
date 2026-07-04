// Pure aggregation for prevalence seeding (Phase E). No I/O, no network —
// just turns per-source dimension states into the rubric/prevalence.json
// shape. Kept separate from seed-prevalence.mjs so it can be unit tested
// without touching git/gh/dist.

/**
 * @param {Array<{ repo: string, states: Record<string, "have"|"partial"|"missing"> | null }>} results
 *   One entry per source. `states` maps dimension id (string) -> state for
 *   sources that scanned successfully; `null` for sources that were skipped
 *   (clone failure, no .claude dir, scan threw) and must not count toward
 *   the denominator.
 * @returns {{ denominator: number, denominator_label: string, dimensions: Record<string, number> }}
 */
export function aggregatePrevalence(results) {
  const dimensions = {};
  let denominator = 0;

  for (const result of results) {
    if (!result.states) continue; // skipped source: not scanned, don't count
    denominator++;
    for (const [id, state] of Object.entries(result.states)) {
      if (state !== "have") continue;
      dimensions[id] = (dimensions[id] ?? 0) + 1;
    }
  }

  return {
    denominator,
    denominator_label: "public setups benchmarked",
    dimensions,
  };
}
