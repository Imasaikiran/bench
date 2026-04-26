#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { load } from "js-yaml";

import { parseArgs } from "./args.js";
import { formatWhy } from "./why.js";
import { mapperToPersona } from "./persona-stub.js";
import { ttyPrompt } from "./prompt.js";

import { detectEnvironment, refuseIfUnsafe } from "./env.js";
import { loadRubric } from "./rubric/load.js";
import { scoreFromCounts } from "./rubric/score.js";
import { inferTier, computeHoursWithCc } from "./rubric/persona.js";
import { deriveCopy } from "./rubric/copy.js";
import { assemblePayload } from "./payload.js";
import { renderPreview } from "./preview.js";
import { askConsent } from "./consent.js";
import { upload } from "./uploader.js";
import { openUrl } from "./browser.js";
import { writeLocalExport } from "./local-export.js";
import { scan } from "./scanner/index.js";

import type { ScoreResult } from "./rubric/score.js";
import type { Rubric } from "./rubric/load.js";
import type { Payload } from "./payload.js";
import type { Tier } from "./rubric/persona.js";
import type { ConsentOutput } from "./consent.js";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(resolve(here, "..", "package.json"), "utf8"),
) as { version: string };

export const VERSION: string = pkg.version;

export type IO = {
  stdout?: (s: string) => void;
  stderr?: (s: string) => void;
};

/**
 * Injectable dependencies — allows tests to mock every side-effectful boundary
 * without touching the real filesystem, network, or terminal.
 */
export type Deps = {
  parseArgs?: typeof parseArgs;
  detectEnvironment?: typeof detectEnvironment;
  refuseIfUnsafe?: typeof refuseIfUnsafe;
  loadRubric?: typeof loadRubric;
  scan?: typeof scan;
  scoreFromCounts?: typeof scoreFromCounts;
  inferTier?: typeof inferTier;
  computeHoursWithCc?: typeof computeHoursWithCc;
  deriveCopy?: typeof deriveCopy;
  assemblePayload?: typeof assemblePayload;
  formatWhy?: typeof formatWhy;
  renderPreview?: typeof renderPreview;
  askConsent?: typeof askConsent;
  upload?: typeof upload;
  openUrl?: typeof openUrl;
  writeLocalExport?: typeof writeLocalExport;
  mapperToPersona?: typeof mapperToPersona;
  ttyPrompt?: typeof ttyPrompt;
};

/**
 * True when this module is being invoked directly as a script (i.e. as the
 * `bench` bin), rather than imported. URL-encodes argv1 so paths containing
 * spaces (e.g. "/Users/.../Claud Workspace/...") still match.
 */
export function isDirectInvocation(
  metaUrl: string,
  argv1: string | undefined,
): boolean {
  if (!argv1) return false;
  return metaUrl === pathToFileURL(argv1).href;
}

export function readRubricVersion(rubricPath: string): string {
  try {
    const parsed = load(readFileSync(rubricPath, "utf8")) as
      | { version?: string }
      | null;
    return parsed?.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

export function bundledRubricPath(): string {
  return resolve(here, "..", "rubric.yaml");
}

// ---------------------------------------------------------------------------
// Inline helpers
// ---------------------------------------------------------------------------

const CHAPTER_ORDER = [
  "Foundation",
  "Automation",
  "Delegation",
  "Craft",
  "Coherence",
] as const;

/**
 * Pick the lowest-scoring chapter; format a brief note.
 */
function buildChapterNote(scored: ScoreResult): string {
  type ChapterName = (typeof CHAPTER_ORDER)[number];
  let lowestName: ChapterName = CHAPTER_ORDER[0]!;
  let lowestScore = scored.chapters[lowestName]?.score ?? 100;

  for (const name of CHAPTER_ORDER) {
    const s = scored.chapters[name]?.score ?? 100;
    if (s < lowestScore) {
      lowestScore = s;
      lowestName = name;
    }
  }

  return `${lowestName}: ${lowestScore}/100 — focus area`;
}

/**
 * Return up to 3 predicate ids whose state is "missing" in the lowest-scoring
 * chapter. Format: "#${id} ${dim.name}".
 */
function deriveMusthaves(scored: ScoreResult, rubric: Rubric): string[] {
  // Find lowest-scoring chapter
  type ChapterName = (typeof CHAPTER_ORDER)[number];
  let lowestName: ChapterName = CHAPTER_ORDER[0]!;
  let lowestScore = scored.chapters[lowestName]?.score ?? 100;

  for (const name of CHAPTER_ORDER) {
    const s = scored.chapters[name]?.score ?? 100;
    if (s < lowestScore) {
      lowestScore = s;
      lowestName = name;
    }
  }

  const chapter = scored.chapters[lowestName];
  if (!chapter) return [];

  const dims = rubric.chapters[lowestName]?.dimensions ?? [];
  const results: string[] = [];

  for (let i = 0; i < chapter.states.length && results.length < 3; i++) {
    if (chapter.states[i] === "missing") {
      const dim = dims[i];
      if (dim) {
        results.push(`#${dim.id} ${dim.name}`);
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

export async function main(
  argv: string[],
  io: IO = {},
  deps: Deps = {},
): Promise<number> {
  const out = io.stdout ?? ((s: string) => process.stdout.write(s + "\n"));
  const err = io.stderr ?? ((s: string) => process.stderr.write(s + "\n"));

  // Wire injectable deps (fall through to real implementations)
  const _parseArgs = deps.parseArgs ?? parseArgs;
  const _detectEnv = deps.detectEnvironment ?? detectEnvironment;
  const _refuseIfUnsafe = deps.refuseIfUnsafe ?? refuseIfUnsafe;
  const _loadRubric = deps.loadRubric ?? loadRubric;
  const _scan = deps.scan ?? scan;
  const _scoreFromCounts = deps.scoreFromCounts ?? scoreFromCounts;
  const _inferTier = deps.inferTier ?? inferTier;
  const _computeHours = deps.computeHoursWithCc ?? computeHoursWithCc;
  const _deriveCopy = deps.deriveCopy ?? deriveCopy;
  const _assemblePayload = deps.assemblePayload ?? assemblePayload;
  const _formatWhy = deps.formatWhy ?? formatWhy;
  const _renderPreview = deps.renderPreview ?? renderPreview;
  const _askConsent = deps.askConsent ?? askConsent;
  const _upload = deps.upload ?? upload;
  const _openUrl = deps.openUrl ?? openUrl;
  const _writeLocalExport = deps.writeLocalExport ?? writeLocalExport;
  const _mapperToPersona = deps.mapperToPersona ?? mapperToPersona;
  const _ttyPrompt = deps.ttyPrompt ?? ttyPrompt;

  // 1. Parse flags
  const flags = _parseArgs(argv);

  // 2. --version shortcut
  if (flags.version) {
    const rubricPath = flags.rubric ?? bundledRubricPath();
    out(`bench v${VERSION}`);
    out(`rubric v${readRubricVersion(rubricPath)}`);
    return 0;
  }

  // 3. Safety checks
  const env = _detectEnv();
  _refuseIfUnsafe(env);

  // 4. Wall-clock timer
  const t0 = Date.now();

  // 5. Load rubric
  const rubricPath = flags.rubric ?? bundledRubricPath();
  const rubric = _loadRubric(rubricPath);

  // 6. Scan
  const scanResult = await _scan(env.claudeHome, { git: true });

  // 7. Score
  const scored = _scoreFromCounts(scanResult.counts, rubric);

  // 8. Tier
  const tier = _inferTier(scanResult.counts) as Tier;

  // 9. Hours
  const activeSecondsTotal =
    typeof scanResult.counts["active_hours_total"] === "number"
      ? (scanResult.counts["active_hours_total"] as number) * 3600
      : 0;
  const hours = _computeHours(activeSecondsTotal);

  // 10. Copy
  const copy = _deriveCopy({
    signatureVerbs: scanResult.raw.git.signatureVerbs,
    hours_with_cc: hours,
  });

  // 11. Helpers
  const chapter_note = buildChapterNote(scored);
  const musthaves = deriveMusthaves(scored, rubric);

  // 12. Assemble payload
  const weeksOnCc =
    typeof scanResult.counts["weeks_on_cc"] === "number"
      ? (scanResult.counts["weeks_on_cc"] as number)
      : 0;

  const payload: Payload = _assemblePayload({
    counts: scanResult.counts,
    chapters: scored.chapters,
    musthaves,
    tier,
    score: scored.score,
    weeks_on_cc: weeksOnCc,
    hours_with_cc: hours,
    signature_verbs: copy.signature_verbs,
    identity: copy.identity,
    hours_meaning: copy.hours_meaning,
    chapter_note,
    handle: flags.handle,
    previous_scan_id: null,
    scanner_version: VERSION,
    rubric_version: rubric.version,
    diagnostics: {
      // TODO(1.20): wire redaction_hits once snapshot tests pin the contract
      redaction_hits: 0,
      parse_warnings: scanResult.diagnostics.parse_warnings,
      skipped_files: scanResult.diagnostics.skipped_files,
      elapsed_ms: Date.now() - t0,
    },
  });

  // 13. --why: print breakdown and exit
  if (flags.why) {
    out(_formatWhy(scored, rubric));
    return 0;
  }

  // 14. Print preview
  out(
    _renderPreview({
      score: payload.score,
      tier: payload.tier,
      weeks_on_cc: payload.weeks_on_cc,
      hours_with_cc: hours,
    }),
  );

  // 15. --offline: write local export and exit
  if (flags.offline) {
    await _writeLocalExport(
      process.cwd(),
      payload,
      _mapperToPersona(payload),
    );
    out("wrote bench-scan.json and bench-scan.html");
    return 0;
  }

  // 16. --dry-run: exit before consent/upload
  if (flags.dryRun) {
    return 0;
  }

  // 17. Ask for consent
  const consent: ConsentOutput = await _askConsent(
    { redactionHits: payload.diagnostics.redaction_hits },
    _ttyPrompt,
  );

  if (!consent.upload) {
    await _writeLocalExport(
      process.cwd(),
      payload,
      _mapperToPersona(payload),
    );
    out("not uploaded. wrote local files.");
    return 0;
  }

  // 18. Upload
  try {
    const result = await _upload(payload);
    _openUrl(result.url);
    out(result.url);
    return 0;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    err(`upload failed: ${msg}. writing local files.`);
    await _writeLocalExport(
      process.cwd(),
      payload,
      _mapperToPersona(payload),
    );
    return 1;
  }
}

if (isDirectInvocation(import.meta.url, process.argv[1])) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
