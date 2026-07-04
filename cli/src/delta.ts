import { promises as fs } from "node:fs";
import { join } from "node:path";
import type { Payload, Chapters } from "./payload.js";

/**
 * Rescan delta (Task D2): "progress is the reward". Deterministic scoring has
 * no variable reward, so the only frame that makes a low score shareable is
 * before/after. This is local-only, ephemeral context for the terminal card —
 * it is never added to Payload (that would make it shareable state; the plan
 * explicitly says not to).
 */
export type ScanDelta = {
  scoreDelta: number;
  /** "Tinkerer → Craftsman" when tier changed, else null. */
  tierCrossed: string | null;
  /** Chapter names whose score increased since prev. */
  gainedChapters: string[];
  /** Musthave strings present in prev's list but resolved (absent) now. */
  gainedMusthaves: string[];
};

const CHAPTER_ORDER = ["Foundation", "Automation", "Delegation", "Craft", "Coherence"] as const;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isChapterResult(v: unknown): v is { score: number; states: string[] } {
  if (!isRecord(v)) return false;
  if (typeof v.score !== "number" || !Number.isFinite(v.score)) return false;
  if (!Array.isArray(v.states)) return false;
  return v.states.every((s) => typeof s === "string");
}

function parseChapters(v: unknown): Chapters | null {
  if (!isRecord(v)) return null;
  const out: Chapters = {};
  for (const [name, result] of Object.entries(v)) {
    if (!isChapterResult(result)) return null;
    out[name] = result;
  }
  return out;
}

function parseMusthaves(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  return v.every((s) => typeof s === "string") ? (v as string[]) : null;
}

/** Minimal shape this module needs from a parsed previous scan. */
type PrevScan = {
  score: number;
  tier: string;
  rubric_version: string;
  chapters: Chapters;
  musthaves: string[];
};

/**
 * Narrow an `unknown` value (parsed JSON from disk) into the minimal shape
 * needed to diff against the current scan. Defensive field-by-field
 * narrowing — no `any`, no trust in the shape of a file that could have been
 * hand-edited, truncated, or written by a future/older CLI version.
 */
function parsePrevScan(prev: unknown): PrevScan | null {
  if (!isRecord(prev)) return null;

  const { score, tier, rubric_version, chapters, musthaves } = prev;

  if (typeof score !== "number" || !Number.isFinite(score)) return null;
  if (typeof tier !== "string" || tier.length === 0) return null;
  if (typeof rubric_version !== "string" || rubric_version.length === 0) return null;

  const parsedChapters = parseChapters(chapters);
  if (parsedChapters === null) return null;

  const parsedMusthaves = parseMusthaves(musthaves);
  if (parsedMusthaves === null) return null;

  return { score, tier, rubric_version, chapters: parsedChapters, musthaves: parsedMusthaves };
}

function chaptersThatGained(prev: Chapters, cur: Chapters): string[] {
  const gained: string[] = [];
  for (const name of CHAPTER_ORDER) {
    const prevScore = prev[name]?.score;
    const curScore = cur[name]?.score;
    if (typeof prevScore === "number" && typeof curScore === "number" && curScore > prevScore) {
      gained.push(name);
    }
  }
  return gained;
}

function musthavesResolved(prevMusthaves: string[], curMusthaves: string[]): string[] {
  const curSet = new Set(curMusthaves);
  return prevMusthaves.filter((m) => !curSet.has(m));
}

/**
 * Diff a previously written bench-scan.json (parsed, untyped JSON) against
 * the current scan. Returns null when `prev` is not a parseable scan, or its
 * rubric_version doesn't match the current scan's — a rubric retune isn't
 * user progress, so it must not be compared like one.
 */
export function diffScans(prev: unknown, cur: Payload): ScanDelta | null {
  const parsed = parsePrevScan(prev);
  if (parsed === null) return null;
  if (parsed.rubric_version !== cur.rubric_version) return null;

  const scoreDelta = cur.score - parsed.score;
  const tierCrossed = cur.tier !== parsed.tier ? `${parsed.tier} → ${cur.tier}` : null;

  return {
    scoreDelta,
    tierCrossed,
    gainedChapters: chaptersThatGained(parsed.chapters, cur.chapters),
    gainedMusthaves: musthavesResolved(parsed.musthaves, cur.musthaves),
  };
}

/**
 * Format the one-line terminal banner, e.g. "+11 since last scan · Tinkerer → Craftsman".
 * Returns null when there is nothing to say: zero score movement and no tier change.
 */
export function formatDeltaBanner(d: ScanDelta): string | null {
  if (d.scoreDelta === 0 && d.tierCrossed === null) return null;

  const sign = d.scoreDelta >= 0 ? "+" : "";
  const base = `${sign}${d.scoreDelta} since last scan`;
  return d.tierCrossed ? `${base} · ${d.tierCrossed}` : base;
}

export type PreviousScanLoad = {
  /** Parsed JSON, or null if bench-scan.json doesn't exist in `dir`. */
  data: unknown;
  /** Set only when the file exists but couldn't be read/parsed as JSON —
   * pushed into diagnostics.parse_warnings by the caller. Never thrown: a
   * corrupt or hand-edited previous scan must degrade to "no banner", not
   * crash the CLI. */
  parseWarning?: string;
};

/**
 * Load `bench-scan.json` from `dir` (the --offline output location) BEFORE
 * it gets overwritten by this run's writeLocalExport call. Must be called
 * ahead of any local-file write in index.ts's main().
 */
export async function loadPreviousScan(dir: string): Promise<PreviousScanLoad> {
  const path = join(dir, "bench-scan.json");
  let raw: string;
  try {
    raw = await fs.readFile(path, "utf8");
  } catch {
    // Missing file is the common, expected case (first scan ever) — not a warning.
    return { data: null };
  }

  try {
    return { data: JSON.parse(raw) as unknown };
  } catch {
    return { data: null, parseWarning: "previous bench-scan.json could not be parsed; skipping rescan delta" };
  }
}
