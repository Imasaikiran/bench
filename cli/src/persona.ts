import type { Payload } from "./payload.js";

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

/**
 * Derives the human-readable hours-meaning string from hours_with_cc.
 * Mirrors the workdays framing from cli/src/rubric/copy.ts.
 * Tier boundaries use raw hours so each bucket's displayed workdays count
 * stays inside its narrative band.
 */
export function deriveHoursMeaning(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return "no time back yet";
  const hLabel = hours === 1 ? "1 hour" : `${hours} hours`;
  if (hours < 8) return `${hLabel} back — almost a workday`;
  const workdays = Math.round(hours / 8);
  const wdLabel = workdays === 1 ? "1 workday" : `${workdays} workdays`;
  if (hours < 40) return `${hours}h back — about ${wdLabel}`;
  if (hours < 80) return `${hours}h back — a sprint of workdays (${workdays})`;
  return `${hours}h back — ${wdLabel}, or a side-project shipped`;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toPersonaShape(payload: any): PersonaShape {
  const handleStr = payload.handle ? `@${payload.handle}` : "@anonymous";
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

export function mapperToPersona(payload: Payload): PersonaShape {
  return toPersonaShape(payload);
}
