import { promises as fs } from "node:fs";
import type { Dirent } from "node:fs";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { join } from "node:path";
import { normalizeEntry } from "./message-shape.js";

const GAP_CAP_MS = 15 * 60 * 1000;

// Plan-mode markers emitted by Claude Code when /plan is active. Gated on
// assistant role to avoid false positives from user text containing the phrase.
const PLAN_MODE_RE = /plan mode|<PlanModeStart>|<\|plan_mode\|>/i;

export function computeActiveSeconds(sortedMs: number[]): number {
  if (sortedMs.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < sortedMs.length; i++) {
    // Bug 2 fix: non-null assert — i is bounded by sortedMs.length
    const cur = sortedMs[i]!;
    const prev = sortedMs[i - 1]!;
    const gap = cur - prev;
    total += Math.min(gap, GAP_CAP_MS);
  }
  return Math.round(total / 1000);
}

export type SessionsReport = {
  sessionsTotal: number;
  planModeSessions: number;
  toolUseCount: number;
  messageCount: number;
  activeSecondsTotal: number;
  weeksOnCc: number;
  earliestStart: string | null;
  skippedLines: number;
  readBytesSum: number;
  readBytesCount: number;
  projectRoots: string[];
  /** Sorted unique skill names invoked via the Skill tool across all sessions. */
  usedSkills: string[];
  parseWarnings: string[];
};

export async function readSessions(claudeHome: string): Promise<SessionsReport> {
  const root = join(claudeHome, "projects");
  const report: SessionsReport = {
    sessionsTotal: 0,
    planModeSessions: 0,
    toolUseCount: 0,
    messageCount: 0,
    activeSecondsTotal: 0,
    weeksOnCc: 0,
    earliestStart: null,
    skippedLines: 0,
    readBytesSum: 0,
    readBytesCount: 0,
    projectRoots: [],
    usedSkills: [],
    parseWarnings: [],
  };
  let earliestMs: number | null = null;
  const projectRootsSet = new Set<string>();
  const usedSkillsSet = new Set<string>();

  // Walk directory tree and collect all .jsonl file paths
  async function walk(dir: string): Promise<string[]> {
    let entries: Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
        report.parseWarnings.push(
          `${dir}: ${(e as NodeJS.ErrnoException).code ?? "UNKNOWN"} — skipped`
        );
      }
      return [];
    }
    const out: string[] = [];
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        out.push(...(await walk(p)));
      } else if (e.isFile() && e.name.endsWith(".jsonl")) {
        out.push(p);
      }
    }
    return out;
  }

  const paths = await walk(root);

  for (const path of paths) {
    report.sessionsTotal++;
    const timestamps: number[] = [];
    let planMode = false;

    let rl: ReturnType<typeof createInterface>;
    try {
      rl = createInterface({
        input: createReadStream(path),
        crlfDelay: Infinity,
      });
    } catch (e) {
      report.parseWarnings.push(
        `${path}: ${(e as NodeJS.ErrnoException).code ?? "UNKNOWN"} — skipped`
      );
      continue;
    }

    try {
      for await (const line of rl) {
        const trimmed = line.replace(/^\uFEFF/, "").trim();
        if (!trimmed) continue;

        // Bug 4 fix: JSON.parse returns unknown, narrow carefully
        let msg: Record<string, unknown>;
        try {
          const parsed: unknown = JSON.parse(trimmed);
          if (
            !parsed ||
            typeof parsed !== "object" ||
            Array.isArray(parsed)
          ) {
            report.skippedLines++;
            continue;
          }
          msg = parsed as Record<string, unknown>;
        } catch {
          report.skippedLines++;
          continue;
        }

        const entry = normalizeEntry(msg);

        if (entry.timestamp) {
          const t = Date.parse(entry.timestamp);
          if (!Number.isNaN(t)) timestamps.push(t);
        }

        if (entry.role === "assistant" && entry.content) {
          report.messageCount++;
          // Sum bytes across ALL Read tool_use blocks in this message (not just
          // the first). Also count every distinct tool_use block.
          for (const c of entry.content) {
            if (typeof c === "object" && c !== null && (c as Record<string, unknown>)["type"] === "tool_use") {
              report.toolUseCount++;
              const block = c as Record<string, unknown>;
              if (block["name"] === "Read") {
                const input = block["input"];
                const bytes = Number(
                  input && typeof input === "object" ? (input as Record<string, unknown>)["bytes_read"] : undefined,
                );
                if (!Number.isNaN(bytes)) { report.readBytesSum += bytes; report.readBytesCount++; }
              }
              if (block["name"] === "Skill") {
                const input = block["input"];
                if (input && typeof input === "object") {
                  const skillName = (input as Record<string, unknown>)["skill"];
                  if (typeof skillName === "string") usedSkillsSet.add(skillName);
                }
              }
            }
          }
          // Plan-mode detection: gated on assistant role to avoid false
          // positives from user text containing the phrase.
          const blob = JSON.stringify(entry.content);
          if (PLAN_MODE_RE.test(blob)) planMode = true;
        }

        if (entry.cwd) {
          // TODO(1.10): normalise cwd before dedup — `~/foo` vs `/Users/x/foo` vs
          // trailing-slash variants currently dedupe wrong.
          projectRootsSet.add(entry.cwd);
        }
      }
    } catch (e) {
      report.parseWarnings.push(
        `${path}: ${(e as NodeJS.ErrnoException).code ?? "UNKNOWN"} — read error`
      );
    } finally {
      rl.close();
    }

    timestamps.sort((a, b) => a - b);
    report.activeSecondsTotal += computeActiveSeconds(timestamps);

    if (planMode) {
      report.planModeSessions++;
    }

    const first = timestamps[0];
    if (first !== undefined && (earliestMs === null || first < earliestMs)) {
      earliestMs = first;
    }
  }

  report.earliestStart = earliestMs !== null ? new Date(earliestMs).toISOString() : null;
  // TODO(1.12): consider injecting `now` so test fixtures pin a stable value.
  report.weeksOnCc =
    earliestMs !== null
      ? Math.floor((Date.now() - earliestMs) / (7 * 86_400 * 1000))
      : 0;
  report.projectRoots = [...projectRootsSet];
  report.usedSkills = [...usedSkillsSet].sort();

  return report;
}
