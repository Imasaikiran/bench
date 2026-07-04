import type { Payload } from "./payload.js";
import type { State } from "./rubric/score.js";

/**
 * Maps an assembled Payload to the PersonaShape consumed by the frozen v1
 * offline renderer (`cli/src/assets/script.js`: renderHero/renderAtelier/
 * renderChapters/renderMustHaves) and the bench.dev API.
 *
 * Ported from web/lib/mapper.ts's `toPersonaShape` (§7.2). Kept byte-faithful
 * in OUTPUT: given the same payload data, the CLI and web personas render
 * identically. Two deliberate divergences from the web mapper, both because
 * the CLI payload already carries better data than the web's synthetic-demo
 * payload assumes:
 *
 *   1. hoursMeaning / chapterNote / identity are passed through verbatim from
 *      the payload (produced by cli/src/rubric/copy.ts, Task B2/B3) instead of
 *      being re-derived. The web mapper recomputes hoursMeaning with its own
 *      `deriveHoursMeaning` because the web's payload doesn't carry authored
 *      copy for it; the CLI's payload already does, and re-deriving would
 *      discard real copy in favor of generic wording.
 *   2. musthaves: the web's PersonaShape wants a 15-slot have/partial/missing
 *      array (one slot per hardcoded UI item in script.js's static MUSTHAVES
 *      list), but the CLI's payload.musthaves (Task B3) is a short list of
 *      human-readable "name: reason" strings for the *lowest chapter's*
 *      missing dimensions — a different shape entirely, produced for a
 *      different UI (the "must fix next" copy) than script.js's fixed
 *      15-item checklist. There's no source of truth on either side that
 *      actually populates a meaningful 15-slot array (web's own demo persona
 *      stubs it as `Array(15).fill("missing")` — see web/lib/demo-persona.ts).
 *      Derive it the same way script.js's static list is structured: each of
 *      the 15 hardcoded items corresponds to one rubric.yaml dimension within
 *      a chapter (3 Foundation + 4 Automation + 4 Delegation + 3 Craft +
 *      1 Hygiene == 15), so pull the matching per-dimension `state` out of
 *      `payload.chapters[chapter].states` by position.
 */

// Index into each chapter's 5-slot `states` array that corresponds to each of
// script.js's 15 hardcoded MUSTHAVES entries, in the order they appear there.
// (rubric.yaml dimension ids in comments for traceability.)
const MUSTHAVE_SLOTS: ReadonlyArray<{ chapter: string; stateIndex: number }> = [
  { chapter: "Foundation", stateIndex: 0 }, // dim 1  Root CLAUDE.md
  { chapter: "Foundation", stateIndex: 2 }, // dim 3  permissions allowlist
  { chapter: "Foundation", stateIndex: 3 }, // dim 4  sub-dir CLAUDE.md
  { chapter: "Automation", stateIndex: 0 }, // dim 6  PostToolUse hook
  { chapter: "Automation", stateIndex: 1 }, // dim 7  PreToolUse hook
  { chapter: "Automation", stateIndex: 3 }, // dim 9  custom slash commands (>=3)
  { chapter: "Automation", stateIndex: 2 }, // dim 8  SessionStart/SessionEnd hook
  { chapter: "Delegation", stateIndex: 2 }, // dim 13 GitHub MCP
  { chapter: "Delegation", stateIndex: 0 }, // dim 11 skills (>=3)
  { chapter: "Delegation", stateIndex: 3 }, // dim 14 code-review subagent
  { chapter: "Delegation", stateIndex: 4 }, // dim 15 test-runner subagent
  { chapter: "Craft", stateIndex: 0 }, // dim 16 plan mode used
  { chapter: "Craft", stateIndex: 2 }, // dim 18 worktrees
  { chapter: "Craft", stateIndex: 4 }, // dim 20 verification before commit
  { chapter: "Hygiene", stateIndex: 2 }, // dim 23 no-bloat / pruned duplicates
];

function deriveMusthaveStates(payload: Payload): State[] {
  return MUSTHAVE_SLOTS.map(({ chapter, stateIndex }) => {
    const state = payload.chapters[chapter]?.states[stateIndex];
    return (state as State | undefined) ?? "missing";
  });
}

// v1 script.js renders three chapter tag labels: strong→"Strong",
// weak→"Needs work", partial→"building". "building" vs "needs work" is
// ambiguous (UX audit §3.3, mirrored from web/lib/mapper.ts). Collapse
// partial→weak so only two states ever render.
function collapseChapterTags(tags: Payload["chapter_tags"]): Array<"strong" | "weak"> {
  return tags.map((t) => (t === "strong" ? "strong" : "weak"));
}

export type PersonaShape = {
  handle: string;
  initial: string;
  weeks: number;
  eyebrow: string;
  title: string;
  tiles: unknown[];
  identity: string;
  hours: number;
  hoursMeaning: string;
  signature: string;
  score: number;
  tier: string;
  chapterNote: string;
  chapterTags: Array<"strong" | "weak">;
  clusters: Record<string, State[]>;
  musthaves: State[];
  /**
   * "Only N% of M setups benchmarked have X. You do." (Task D1). Null when
   * the prevalence table is unpopulated or nothing qualifies — see
   * cli/src/rubric/prevalence.ts:pickHeadlineRarity.
   *
   * The frozen v1 offline renderer (`script.js`'s renderHero/renderAtelier/
   * renderChapters/renderMustHaves) has no slot that reads this field, so it
   * is harmlessly ignored there today. Attached to the persona object so a
   * future web/OG render surface can pick it up without another payload
   * plumbing change.
   */
  headlineRarity: string | null;
};

export function titleForTier(t: string): string {
  switch (t) {
    case "Explorer":
      return "You're getting started.";
    case "Tinkerer":
      return "You've been building.";
    case "Craftsman":
      return "You've found your rhythm.";
    case "Operator":
      return "You're orchestrating work.";
    case "Conductor":
      return "You run a whole studio.";
    default:
      return "";
  }
}

/**
 * Maps an assembled Payload to the PersonaShape expected by the local-export
 * renderer and the bench.dev API. Replaces the Task 1.22 forward-stub.
 */
export function mapperToPersona(payload: Payload): PersonaShape {
  const handleStr = payload.handle ? `@${payload.handle}` : "@anonymous";
  // charAt(0) returns "" on empty string (safe) rather than undefined.
  // The outer `payload.handle ?` guard ensures handle is truthy (non-empty string).
  const initial = payload.handle ? payload.handle.charAt(0).toUpperCase() : "•";

  const chapterNames = ["Foundation", "Automation", "Delegation", "Craft", "Hygiene"];
  const clusters: Record<string, State[]> = {};
  for (const name of chapterNames) {
    clusters[name] = (payload.chapters[name]?.states as State[] | undefined) ?? [];
  }

  return {
    handle: handleStr,
    initial,
    weeks: payload.weeks_on_cc,
    eyebrow: `scanned just now · ${payload.weeks_on_cc} weeks on claude code`,
    title: titleForTier(payload.tier),
    tiles: payload.tiles,
    identity: payload.identity,
    // hours_with_cc is null when hours_hidden=true. ?? 0 normalizes for
    // downstream rendering.
    hours: payload.hours_with_cc ?? 0,
    hoursMeaning: payload.hours_meaning,
    signature: `you ${payload.signature_verbs.join(" · you ")}`,
    score: payload.score,
    tier: payload.tier,
    chapterNote: payload.chapter_note,
    chapterTags: collapseChapterTags(payload.chapter_tags),
    clusters,
    musthaves: deriveMusthaveStates(payload),
    headlineRarity: payload.headline_rarity,
  };
}
