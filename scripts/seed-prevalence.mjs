#!/usr/bin/env node
// Phase E prevalence seeding.
//
// Populates rubric/prevalence.json from PUBLIC Claude Code setups so the
// "Only N% of M public setups benchmarked have X. You do." headline can go
// live truthfully (see cli/src/rubric/prevalence.ts — NEVER fabricate this
// data; ship honest-empty until this script has real, reviewed output).
//
// Approach: for each source repo in scripts/prevalence-sources.json, shallow
// -clone it to a temp dir and run the bench scanner + scorer DIRECTLY against
// the built cli/dist modules (import scan / loadRubric / scoreFromCounts).
// This needed ZERO changes to cli/src: `--dry-run` only short-circuits before
// consent/upload and never emits per-dimension states to stdout, and `--debug`
// isn't wired to anything yet (see TODO in cli/src/index.ts). The scanner and
// scorer are already plain exported functions, so importing them directly is
// the cleanest non-interactive path to per-dimension have/partial/missing
// states.
//
// CAVEAT (by design, not a bug): public repo .claude/ directories have no
// ~/.claude/projects session logs. Every session-derived dimension (sessions,
// plan-mode ratio, active hours, git-signature verbs, active-skill ratio,
// etc.) will read "missing" for every source here. That's fine and honest —
// this prevalence table only speaks to STATICALLY detectable dimensions:
// skills present, hooks wired in settings.json, CLAUDE.md shape, settings
// surface, agents, and commands. Session-derived dimensions simply won't
// accumulate any "have" counts from this seed and will stay absent from the
// output dimensions map (count of 0 -> omitted, per the shape below).
//
// Also note: dimension 2 (settings validity) reads `settings_valid`, which
// cli/src/scanner/config.ts now emits (fixed: true when settings.json exists
// and parses as a JSON object). No workaround needed in this script anymore.
//
// Usage:
//   node scripts/seed-prevalence.mjs            # dry-run: prints table only
//   node scripts/seed-prevalence.mjs --write     # also writes rubric/prevalence.json
//
// Idempotent: re-running re-clones and re-scans fresh each time; nothing is
// cached. Founder reviews the dry-run table before ever passing --write.

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { scan } from "../cli/dist/scanner/index.js";
import { loadRubric } from "../cli/dist/rubric/load.js";
import { scoreFromCounts } from "../cli/dist/rubric/score.js";
import { aggregatePrevalence } from "./lib/aggregate.mjs";

const execFileAsync = promisify(execFile);

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(here, "..");
const SOURCES_PATH = resolve(here, "prevalence-sources.json");
const RUBRIC_YAML_PATH = resolve(REPO_ROOT, "cli", "rubric.yaml");
const PREVALENCE_OUT_PATH = resolve(REPO_ROOT, "rubric", "prevalence.json");

const CHAPTER_NAMES = ["Foundation", "Automation", "Delegation", "Craft", "Coherence"];

/** Flatten scoreFromCounts' chapter-shaped states into { "<dimId>": state }. */
function flattenStates(scored, rubric) {
  const states = {};
  for (const chapterName of CHAPTER_NAMES) {
    const chapter = scored.chapters[chapterName];
    const dims = rubric.chapters[chapterName]?.dimensions ?? [];
    if (!chapter) continue;
    for (let i = 0; i < chapter.states.length; i++) {
      const dim = dims[i];
      if (dim) states[String(dim.id)] = chapter.states[i];
    }
  }
  return states;
}

/**
 * Clone `repo` (owner/name) into a fresh temp dir, fetching only what's
 * needed to read .claude/ and root CLAUDE.md: --depth 1 (no history) plus
 * --filter=blob:none + sparse-checkout (skip file contents outside the
 * checkout scope). Large monorepos (e.g. supabase, next.js) would otherwise
 * pull hundreds of MB of unrelated blobs for a --depth 1 clone. Returns the
 * dir path.
 */
async function shallowClone(repo, destParent) {
  const dest = join(destParent, repo.replace("/", "__"));
  await execFileAsync("git", [
    "clone",
    "--depth",
    "1",
    "--filter=blob:none",
    "--sparse",
    "--quiet",
    `https://github.com/${repo}.git`,
    dest,
  ]);
  // --skip-checks: CLAUDE.md is a file, not a directory, and cone-mode
  // sparse-checkout refuses non-directory patterns without it.
  await execFileAsync(
    "git",
    ["sparse-checkout", "set", "--skip-checks", ".claude", "CLAUDE.md"],
    { cwd: dest },
  );
  return dest;
}

/** Scan one source repo. Returns { repo, note, states, skipReason, haveCount }. */
async function scanSource(source, rubric, tmpRoot) {
  const { repo, note } = source;
  let cloneDir;
  try {
    cloneDir = await shallowClone(repo, tmpRoot);
  } catch (e) {
    return { repo, note, states: null, skipReason: `clone failed: ${e.message.split("\n")[0]}` };
  }

  const claudeHome = join(cloneDir, ".claude");

  try {
    const scanResult = await scan(claudeHome, { git: false });
    const scored = scoreFromCounts(scanResult.counts, rubric);
    const states = flattenStates(scored, rubric);
    const haveCount = Object.values(states).filter((s) => s === "have").length;
    return { repo, note, states, skipReason: null, haveCount };
  } catch (e) {
    return { repo, note, states: null, skipReason: `scan failed: ${e.message.split("\n")[0]}` };
  } finally {
    await rm(cloneDir, { recursive: true, force: true });
  }
}

function printTable(results) {
  const rows = results.map((r) => ({
    repo: r.repo,
    "dims have": r.states ? String(r.haveCount) : "-",
    "skipped why": r.skipReason ?? "",
  }));
  console.table(rows);
}

async function main() {
  const write = process.argv.includes("--write");

  const sources = JSON.parse(await readFile(SOURCES_PATH, "utf8"));
  const rubric = loadRubric(RUBRIC_YAML_PATH);

  const tmpRoot = await mkdtemp(join(tmpdir(), "bench-prevalence-"));
  const results = [];
  try {
    for (const source of sources) {
      console.error(`scanning ${source.repo}...`);
      const result = await scanSource(source, rubric, tmpRoot);
      results.push(result);
    }
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }

  printTable(results);

  const table = aggregatePrevalence(
    results.map((r) => ({ repo: r.repo, states: r.states })),
  );

  console.log();
  console.log(`denominator (scanned successfully): ${table.denominator} / ${results.length} sources`);
  console.log(JSON.stringify(table, null, 2));

  if (write) {
    await writeFile(PREVALENCE_OUT_PATH, JSON.stringify(table, null, 2) + "\n", "utf8");
    console.log(`\nwrote ${PREVALENCE_OUT_PATH}`);
  } else {
    console.log("\ndry-run only (no files written). Pass --write to persist.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
