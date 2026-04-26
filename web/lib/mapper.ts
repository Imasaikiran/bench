// payload is `any` because it crosses the wire-format boundary — zod validation in /api/scan (Task 1.24) gives us runtime guarantees.

export type State = "have" | "partial" | "missing";
export type ChapterTag = "strong" | "partial" | "weak";
export type ChapterName = "Foundation" | "Automation" | "Delegation" | "Craft" | "Coherence";

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

// Derives a human-readable string from hours_with_cc.
// Mirrors the workdays framing from cli/src/rubric/copy.ts but with
// richer copy per §7.2 hero flex spec. Workdays @ 8h/day.
// Empty-string handle ("") is falsy — treated as anonymous. Documented intent.
function deriveHoursMeaning(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return "no time back yet";
  const workdays = Math.round(hours / 8);
  if (hours < 8) return `${hours} hours back — almost a workday`;
  if (workdays < 5) return `${hours}h back — about ${workdays} workdays`;
  if (workdays < 10) return `${hours}h back — a sprint of workdays (${workdays})`;
  return `${hours}h back — ${workdays} workdays, or a side-project shipped`;
}

function titleForTier(t: string): string {
  switch (t) {
    case "Explorer":  return "You're getting started.";
    case "Tinkerer":  return "You've been building.";
    case "Craftsman": return "You've found your rhythm.";
    case "Operator":  return "You're orchestrating work.";
    case "Conductor": return "You run a whole studio.";
    default:          return "";
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toPersonaShape(payload: any): PersonaShape {
  const handleStr = payload.handle ? `@${payload.handle}` : "@anonymous";
  // charAt(0) returns "" on empty string (safe) rather than undefined.
  // The outer `payload.handle ?` guard ensures handle is truthy (non-empty string).
  const initial = payload.handle
    ? (payload.handle as string).charAt(0).toUpperCase()
    : "•";

  return {
    handle: handleStr,
    initial,
    weeks: payload.weeks_on_cc,
    eyebrow: `scanned just now · ${payload.weeks_on_cc} weeks on claude code`,
    title: titleForTier(payload.tier),
    tiles: payload.tiles.slice(0, 4),
    identity: payload.identity,
    hours: payload.hours_with_cc ?? 0,
    hoursMeaning: deriveHoursMeaning(payload.hours_with_cc ?? 0),
    signature: `you ${payload.signature_verbs.join(" · you ")}`,
    score: payload.score,
    tier: payload.tier,
    chapterNote: payload.chapter_note,
    chapterTags: payload.chapter_tags,
    clusters: {
      Foundation: payload.chapters.Foundation.states,
      Automation: payload.chapters.Automation.states,
      Delegation: payload.chapters.Delegation.states,
      Craft:      payload.chapters.Craft.states,
      Coherence:  payload.chapters.Coherence.states,
    },
    musthaves: payload.musthaves,
  };
}
