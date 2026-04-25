import { promises as fs } from "node:fs";
import type { Dirent } from "node:fs";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { join } from "node:path";

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
    parseWarnings: [],
  };
  let earliestMs: number | null = null;
  const projectRootsSet = new Set<string>();

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

        report.messageCount++;

        // Bug 3 fix: typeof guards at each use site
        if (typeof msg["timestamp"] === "string") {
          const t = Date.parse(msg["timestamp"]);
          if (!Number.isNaN(t)) {
            timestamps.push(t);
          }
        }

        if (
          msg["role"] === "assistant" &&
          Array.isArray(msg["content"])
        ) {
          // Sum bytes across ALL Read tool_use blocks in this message (not just
          // the first). Also count every distinct tool_use block.
          for (const c of msg["content"] as unknown[]) {
            if (
              typeof c === "object" && c !== null &&
              (c as Record<string, unknown>)["type"] === "tool_use"
            ) {
              report.toolUseCount++;

              if ((c as Record<string, unknown>)["name"] === "Read") {
                const input = (c as Record<string, unknown>)["input"];
                const bytes = Number(
                  input && typeof input === "object"
                    ? (input as Record<string, unknown>)["bytes_read"]
                    : undefined,
                );
                if (!Number.isNaN(bytes)) {
                  report.readBytesSum += bytes;
                  report.readBytesCount++;
                }
              }
            }
          }

          // Plan-mode detection: gated on assistant role to avoid false
          // positives from user text containing the phrase.
          const blob = JSON.stringify(msg["content"]);
          if (PLAN_MODE_RE.test(blob)) {
            planMode = true;
          }
        }

        // Bug 3 fix: typeof guard for cwd
        if (typeof msg["cwd"] === "string") {
          // TODO(1.10): normalise cwd before dedup — `~/foo` vs `/Users/x/foo` vs
          // trailing-slash variants currently dedupe wrong.
          projectRootsSet.add(msg["cwd"] as string);
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

  return report;
}
