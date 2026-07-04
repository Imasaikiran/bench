// payload is `any` because it crosses the wire-format boundary — zod validation in /api/scan (Task 1.24) gives us runtime guarantees.

export type State = "have" | "partial" | "missing";
export type ChapterTag = "strong" | "partial" | "weak";
export type ChapterName = "Foundation" | "Automation" | "Delegation" | "Craft" | "Hygiene";

export type PersonaShape = {
  handle: string;
  initial: string;
  weeks: number;
  eyebrow: string;
  title: string;
  tiles: Array<{ label: string; value: string; equiv: string }>;
  identity: string;
  hours: number;
  hoursMeaning: string;
  signature: string;
  score: number;
  tier: string;
  chapterNote: string;
  chapterTags: ChapterTag[];
  clusters: Record<ChapterName, State[]>;
  musthaves: State[];
};

/**
 * Derives the human-readable hours-meaning string from hours_with_cc.
 * Mirrors the workdays framing from cli/src/rubric/copy.ts.
 * Tiered copy mirrors §7.2 hero flex spec. Workdays @ 8h/day.
 *
 * Tier boundaries use raw hours (not rounded workdays) so each bucket's
 * displayed workdays count stays inside its narrative band:
 *   <=0      → "no time back yet"
 *   <8       → "Nh back — almost a workday"
 *   <40      → "Nh back — about K workdays"        (1–4 wd)
 *   <80      → "Nh back — a sprint of workdays (K)" (5–9 wd)
 *   >=80     → "Nh back — K workdays, or a side-project shipped" (10+ wd)
 *
 * Singular/plural grammar handled (1 hour vs 2 hours, 1 workday vs 2 workdays).
 */
// UX audit §3.1 + spec §5.3: the hours number is time SPENT with Claude Code,
// not time "saved" or "given back". No overclaim about what the user would
// have done with the time. Just an honest workday equivalent.
export function deriveHoursMeaning(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return "not enough history yet";
  const workdays = Math.max(1, Math.round(hours / 8));
  const wdLabel = workdays === 1 ? "1 working day" : `${workdays} working days`;
  return `≈ ${wdLabel}, side by side with Claude Code`;
}

// v1 script.js renders three chapter labels: strong→"Strong", weak→"Needs
// work", partial→"building". "building" vs "needs work" is ambiguous (UX
// audit §3.3). Collapse partial→weak so only two states ever render.
function collapseChapterTags(tags: unknown): Array<"strong" | "weak"> {
  if (!Array.isArray(tags)) return [];
  return tags.map((t) => (t === "strong" ? "strong" : "weak"));
}

export function titleForTier(t: string): string {
  switch (t) {
    case "Explorer":  return "You're getting started.";
    case "Tinkerer":  return "You've been building.";
    case "Craftsman": return "You've found your rhythm.";
    case "Operator":  return "You're orchestrating work.";
    case "Conductor": return "You run a whole studio.";
    default:          return "";
  }
}

export function toPersonaShape(payload: any): PersonaShape {
  const handleStr = payload.handle ? `@${payload.handle}` : "@anonymous";
  // charAt(0) returns "" on empty string (safe) rather than undefined.
  // The outer `payload.handle ?` guard ensures handle is truthy (non-empty string).
  // Empty-string handle ("") is falsy — treated as anonymous. Documented intent.
  const initial = payload.handle
    ? (payload.handle as string).charAt(0).toUpperCase()
    : "•";

  return {
    handle: handleStr,
    initial,
    weeks: payload.weeks_on_cc,
    eyebrow: `scanned just now · ${payload.weeks_on_cc} weeks on claude code`,
    title: titleForTier(payload.tier),
    tiles: payload.tiles.slice(0, 4), // validator (Task 1.24) enforces length-4; slice is belt-and-suspenders
    identity: payload.identity,
    // hours_with_cc is null when hours_hidden=true (§7.1). ?? 0 normalizes
    // for downstream rendering — other field guards trust the validator.
    hours: payload.hours_with_cc ?? 0,
    hoursMeaning: deriveHoursMeaning(payload.hours_with_cc ?? 0),
    signature: `you ${payload.signature_verbs.join(" · you ")}`,
    score: payload.score,
    tier: payload.tier,
    chapterNote: payload.chapter_note,
    chapterTags: collapseChapterTags(payload.chapter_tags),
    clusters: {
      Foundation: payload.chapters.Foundation.states,
      Automation: payload.chapters.Automation.states,
      Delegation: payload.chapters.Delegation.states,
      Craft:      payload.chapters.Craft.states,
      Hygiene:    payload.chapters.Hygiene.states,
    },
    musthaves: payload.musthaves,
  };
}
