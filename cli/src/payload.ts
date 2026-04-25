import { createHmac } from "node:crypto";

// NOT a secret — friction only. See rubric §10.3 item 10.
const BUNDLED_HMAC_KEY = "bench-v1-integrity-key-public-do-not-treat-as-secret";

const CHAPTER_NAMES = ["Foundation", "Automation", "Delegation", "Craft", "Coherence"] as const;

export type Tier = "Explorer" | "Tinkerer" | "Craftsman" | "Operator" | "Conductor";
export type ChapterTag = "strong" | "partial" | "weak";

export type ChapterResult = { score: number; states: string[] };
export type Chapters = Record<string, ChapterResult>;

export type AssembleInput = {
  counts: Record<string, unknown>;
  chapters: Chapters;
  musthaves: string[];
  tier: Tier;
  score: number;
  weeks_on_cc: number;
  hours_with_cc: number | null;
  signature_verbs: string[];
  identity: string;
  hours_meaning: string;
  chapter_note: string;
  handle: string | null;
  previous_scan_id: string | null;
  scanner_version: string;
  rubric_version: string;
  diagnostics: {
    redaction_hits: number;
    parse_warnings: string[];
    skipped_files: number;
    elapsed_ms: number;
  };
  tiles?: unknown[];
};

export type Payload = {
  schema_version: "1.0";
  rubric_version: string;
  scanner_version: string;
  scanned_at: string;
  handle: string | null;
  previous_scan_id: string | null;
  os: NodeJS.Platform;
  node_version: string;
  tier: Tier;
  score: number;
  weeks_on_cc: number;
  hours_with_cc: number | null;
  hours_hidden: boolean;
  counts: Record<string, unknown>;
  chapters: Chapters;
  chapter_tags: ChapterTag[];
  musthaves: string[];
  signature_verbs: string[];
  tiles: unknown[];
  identity: string;
  hours_meaning: string;
  hours_label: string;
  chapter_note: string;
  diagnostics: AssembleInput["diagnostics"];
  integrity: { client_hmac: string; hmac_key_id: "v1" };
};

export function canonicalJson(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(canonicalJson).join(",") + "]";
  const obj = v as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalJson(obj[k])).join(",") + "}";
}

function deriveChapterTags(ch: Chapters): ChapterTag[] {
  return CHAPTER_NAMES.map((n) => {
    const s = ch[n]?.score ?? 0;
    if (s >= 70) return "strong";
    if (s >= 40) return "partial";
    return "weak";
  });
}

export function assemblePayload(input: AssembleInput): Payload {
  const integrity = { client_hmac: "", hmac_key_id: "v1" as const };
  const payload: Payload = {
    schema_version: "1.0",
    rubric_version: input.rubric_version,
    scanner_version: input.scanner_version,
    scanned_at: new Date().toISOString(),
    handle: input.handle ?? null,
    previous_scan_id: input.previous_scan_id ?? null,
    os: process.platform,
    node_version: process.version.replace(/^v/, ""),
    tier: input.tier,
    score: input.score,
    weeks_on_cc: input.weeks_on_cc,
    hours_with_cc: input.hours_with_cc ?? null,
    hours_hidden: input.hours_with_cc == null,
    counts: input.counts,
    chapters: input.chapters,
    chapter_tags: deriveChapterTags(input.chapters),
    musthaves: input.musthaves,
    signature_verbs: input.signature_verbs,
    tiles: input.tiles ?? [],
    identity: input.identity,
    hours_meaning: input.hours_meaning,
    hours_label: "hours with Claude Code",
    chapter_note: input.chapter_note,
    diagnostics: input.diagnostics,
    integrity,
  };
  integrity.client_hmac = createHmac("sha256", BUNDLED_HMAC_KEY)
    .update(canonicalJson(payload.counts))
    .digest("hex");
  return payload;
}
