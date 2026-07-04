import type { ScoreResult } from "./rubric/score.js";
import type { Rubric } from "./rubric/load.js";

const CHAPTER_ORDER = [
  "Foundation",
  "Automation",
  "Delegation",
  "Craft",
  "Hygiene",
] as const;

const DOT_LEADER_WIDTH = 30;

/**
 * Build a dot-leader line for a single dimension, e.g.:
 *   "  #1 Root CLAUDE.md ........ have"
 *
 * The label is padded to DOT_LEADER_WIDTH chars (including leading "  #id name ")
 * with dots, then the state is appended.
 */
function dimLine(id: number, name: string, state: string): string {
  const label = `  #${id} ${name}`;
  const dots = DOT_LEADER_WIDTH - label.length;
  const leader = dots > 0 ? " " + ".".repeat(dots) : " ";
  return `${label}${leader} ${state}`;
}

/**
 * Render a human-readable breakdown of the scored rubric.
 *
 * Sample output:
 *   Foundation 72/100
 *     #1 Root CLAUDE.md ........ have
 *     #2 settings.json ......... partial
 *     ...
 *   Automation 40/100
 *     #6 ...
 *
 * If a dimension id from `scored` has no matching entry in `rubric`, prints
 * "#? unknown" rather than throwing.
 */
export function formatWhy(scored: ScoreResult, rubric: Rubric): string {
  const lines: string[] = [];

  for (const chapterName of CHAPTER_ORDER) {
    const chapterResult = scored.chapters[chapterName];
    if (!chapterResult) continue;

    lines.push(`${chapterName} ${chapterResult.score}/100`);

    const rubricChapter = rubric.chapters[chapterName];
    const dims = rubricChapter?.dimensions ?? [];

    // Build a lookup from dimension index to {id, name}.
    // The states array is parallel to the rubric dimensions array.
    chapterResult.states.forEach((state, idx) => {
      const dim = dims[idx];
      if (dim) {
        lines.push(dimLine(dim.id, dim.name, state));
      } else {
        // Dimension entry missing in rubric — degrade gracefully.
        lines.push(dimLine(0, "unknown", state).replace("#0", "#?"));
      }
    });
  }

  return lines.join("\n");
}
