import { execFile } from "node:child_process";
import { promisify } from "node:util";

const pexec = promisify(execFile);

export type GitReport = {
  conventionalRatio: number;
  signatureVerbs: string[];
  commitBurstCorrelation: number;
  commitsTotal: number;
  skipped: string[];
};

const CONVENTIONAL =
  /^(feat|fix|chore|docs|refactor|test|style|perf|ci|build|revert)(\(.+\))?!?:/;

/**
 * Read git log signals from one or more repo roots.
 *
 * @param roots        Absolute paths to git repo roots.
 * @param ccActiveHours  Set (or array) of ISO-8601 hour-bucket strings
 *   (e.g. "2024-03-15T14") representing hours when Claude Code was active.
 *   Task 1.10 will pass a ReadonlySet<string>; callers may also pass a plain
 *   readonly string[] — both are normalised internally.
 *
 * @remarks  Each repo is capped at 2000 commits. Larger monorepos (50k+
 *   commits) would take several seconds to parse; 2000 is enough for the
 *   burst-correlation signal without blocking the scanner for too long.
 */
export async function readGitSignals(
  roots: string[],
  ccActiveHours: ReadonlySet<string> | readonly string[],
): Promise<GitReport> {
  // Adaptation 1 — normalise Set-or-Array to a Set so .has() always works.
  const activeHours: ReadonlySet<string> =
    ccActiveHours instanceof Set
      ? (ccActiveHours as ReadonlySet<string>)
      : new Set(ccActiveHours as readonly string[]);

  const verbCounts = new Map<string, number>();
  let total = 0;
  let conventional = 0;
  let burstOverlap = 0;
  const skipped: string[] = [];

  for (const root of roots) {
    try {
      const { stdout } = await pexec(
        "git",
        ["-C", root, "log", "--pretty=%H|%ct|%s", "-n", "2000"],
        { maxBuffer: 8 * 1024 * 1024 },
      );

      for (const line of stdout.split("\n")) {
        if (!line) continue;

        // Adaptation 2 — manual index-based split so subjects containing "|"
        // are handled correctly, and noUncheckedIndexedAccess is satisfied
        // without non-null assertions.
        const firstPipe = line.indexOf("|");
        const secondPipe = line.indexOf("|", firstPipe + 1);
        if (firstPipe < 0 || secondPipe < 0) continue;
        const ct = line.slice(firstPipe + 1, secondPipe);
        const subject = line.slice(secondPipe + 1);

        total++;

        if (CONVENTIONAL.test(subject)) conventional++;

        // Adaptation 3 — first[1] may be undefined; guard with if (verb).
        const first = subject
          .toLowerCase()
          .match(/^(?:\w+(?:\(.+\))?!?:\s*)?(\w+)/);
        const verb = first?.[1];
        if (verb) verbCounts.set(verb, (verbCounts.get(verb) ?? 0) + 1);

        // Adaptation 5 — guard against empty / non-numeric ct before Date
        // construction to avoid NaN timestamps.
        const ctNum = Number(ct);
        if (!Number.isFinite(ctNum) || ctNum <= 0) continue;
        const hourBucket = new Date(ctNum * 1000).toISOString().slice(0, 13);
        if (activeHours.has(hourBucket)) burstOverlap++;
      }
    } catch (e: unknown) {
      // Adaptation 4 — typed catch; no `any`.
      const msg = e instanceof Error ? e.message : String(e);
      skipped.push(`${root}: ${msg}`);
    }
  }

  const sorted = [...verbCounts.entries()].sort((a, b) => b[1] - a[1]);

  return {
    conventionalRatio: total === 0 ? 0 : conventional / total,
    signatureVerbs: sorted.slice(0, 3).map(([v]) => v),
    commitBurstCorrelation: total === 0 ? 0 : burstOverlap / total,
    commitsTotal: total,
    skipped,
  };
}
