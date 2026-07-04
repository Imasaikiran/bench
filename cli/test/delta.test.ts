import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { diffScans, formatDeltaBanner, loadPreviousScan } from "../src/delta.js";
import type { ScanDelta } from "../src/delta.js";
import type { Payload } from "../src/payload.js";

/** Minimal valid Payload for testing — mirrors local-export.test.ts's makePayload. */
function makePayload(overrides: Partial<Payload> = {}): Payload {
  return {
    schema_version: "1.0",
    rubric_version: "0.1.0",
    scanner_version: "0.0.1-alpha.0",
    scanned_at: "2026-07-03T00:00:00.000Z",
    handle: null,
    previous_scan_id: null,
    os: "linux",
    node_version: "20.0.0",
    tier: "Craftsman",
    score: 34,
    weeks_on_cc: 9,
    hours_with_cc: 187,
    hours_hidden: false,
    counts: { sessions_total: 100 },
    chapters: {
      Foundation: { score: 72, states: ["have"] },
      Automation: { score: 40, states: ["have"] },
    },
    chapter_tags: ["strong", "weak", "weak", "weak", "weak"],
    musthaves: [],
    signature_verbs: ["install", "prune"],
    tiles: [],
    identity: "test identity",
    hours_meaning: "test meaning",
    hours_label: "hours with Claude Code",
    chapter_note: "test note",
    headline_rarity: null,
    diagnostics: {
      redaction_hits: 0,
      parse_warnings: [],
      skipped_files: 0,
      elapsed_ms: 1200,
    },
    integrity: { client_hmac: "abc123".repeat(10) + "abcd", hmac_key_id: "v1" },
    ...overrides,
  };
}

describe("diffScans", () => {
  it("computes a positive delta with a tier crossing", () => {
    const prev = makePayload({
      score: 23,
      tier: "Tinkerer",
      chapters: {
        Foundation: { score: 60, states: ["have"] },
        Automation: { score: 30, states: ["missing"] },
      },
    });
    const cur = makePayload({
      score: 34,
      tier: "Craftsman",
      chapters: {
        Foundation: { score: 72, states: ["have"] },
        Automation: { score: 40, states: ["have"] },
      },
    });

    const delta = diffScans(prev, cur);
    expect(delta).not.toBeNull();
    expect(delta?.scoreDelta).toBe(11);
    expect(delta?.tierCrossed).toBe("Tinkerer → Craftsman");
    expect(delta?.gainedChapters.sort()).toEqual(["Automation", "Foundation"]);
  });

  it("computes a positive delta within the same tier (no crossing)", () => {
    const prev = makePayload({ score: 30, tier: "Craftsman" });
    const cur = makePayload({ score: 34, tier: "Craftsman" });

    const delta = diffScans(prev, cur);
    expect(delta).not.toBeNull();
    expect(delta?.scoreDelta).toBe(4);
    expect(delta?.tierCrossed).toBeNull();
  });

  it("computes a negative delta honestly", () => {
    const prev = makePayload({ score: 37, tier: "Craftsman" });
    const cur = makePayload({ score: 34, tier: "Craftsman" });

    const delta = diffScans(prev, cur);
    expect(delta).not.toBeNull();
    expect(delta?.scoreDelta).toBe(-3);
    expect(delta?.tierCrossed).toBeNull();
  });

  it("returns a delta with scoreDelta 0 when score is unchanged and tier unchanged", () => {
    const prev = makePayload({ score: 34, tier: "Craftsman" });
    const cur = makePayload({ score: 34, tier: "Craftsman" });

    const delta = diffScans(prev, cur);
    expect(delta).not.toBeNull();
    expect(delta?.scoreDelta).toBe(0);
    expect(delta?.tierCrossed).toBeNull();
  });

  it("returns null when rubric_version does not match (a rubric retune isn't user progress)", () => {
    const prev = makePayload({ rubric_version: "0.1.0", score: 10 });
    const cur = makePayload({ rubric_version: "0.2.0", score: 34 });

    expect(diffScans(prev, cur)).toBeNull();
  });

  it("returns null when prev is not an object", () => {
    expect(diffScans(null, makePayload())).toBeNull();
    expect(diffScans(undefined, makePayload())).toBeNull();
    expect(diffScans("garbage", makePayload())).toBeNull();
    expect(diffScans(42, makePayload())).toBeNull();
    expect(diffScans([1, 2, 3], makePayload())).toBeNull();
  });

  it("returns null when prev is missing required fields", () => {
    expect(diffScans({}, makePayload())).toBeNull();
    expect(diffScans({ score: 10 }, makePayload())).toBeNull();
    expect(diffScans({ score: 10, rubric_version: "0.1.0" }, makePayload())).toBeNull();
  });

  it("returns null when prev has wrong field types", () => {
    const cur = makePayload();
    expect(
      diffScans(
        { score: "not-a-number", tier: "Tinkerer", rubric_version: "0.1.0", chapters: {}, musthaves: [] },
        cur,
      ),
    ).toBeNull();
    expect(
      diffScans(
        { score: 10, tier: 42, rubric_version: "0.1.0", chapters: {}, musthaves: [] },
        cur,
      ),
    ).toBeNull();
    expect(
      diffScans(
        { score: 10, tier: "Tinkerer", rubric_version: "0.1.0", chapters: "nope", musthaves: [] },
        cur,
      ),
    ).toBeNull();
  });

  it("computes gainedChapters correctly — only chapters whose score increased", () => {
    const prev = makePayload({
      chapters: {
        Foundation: { score: 60, states: ["have"] },
        Automation: { score: 50, states: ["have"] },
      },
    });
    const cur = makePayload({
      chapters: {
        Foundation: { score: 60, states: ["have"] }, // unchanged
        Automation: { score: 40, states: ["have"] }, // decreased
      },
    });

    const delta = diffScans(prev, cur);
    expect(delta?.gainedChapters).toEqual([]);
  });

  it("computes gainedMusthaves — musthave strings resolved since prev", () => {
    const prev = makePayload({
      musthaves: ["Root CLAUDE.md: keeps context", "PreToolUse hook: safety net"],
    });
    const cur = makePayload({
      musthaves: ["PreToolUse hook: safety net"],
    });

    const delta = diffScans(prev, cur);
    expect(delta?.gainedMusthaves).toEqual(["Root CLAUDE.md: keeps context"]);
  });

  it("gainedMusthaves is empty when nothing resolved", () => {
    const prev = makePayload({ musthaves: ["A: reason"] });
    const cur = makePayload({ musthaves: ["A: reason", "B: reason"] });

    const delta = diffScans(prev, cur);
    expect(delta?.gainedMusthaves).toEqual([]);
  });

  it("handles a garbage prev with non-object chapters/musthaves gracefully", () => {
    const cur = makePayload();
    expect(
      diffScans(
        { score: 10, tier: "Tinkerer", rubric_version: cur.rubric_version, chapters: null, musthaves: null },
        cur,
      ),
    ).toBeNull();
  });
});

describe("formatDeltaBanner", () => {
  it("formats a positive delta with tier crossing", () => {
    const d: ScanDelta = {
      scoreDelta: 11,
      tierCrossed: "Tinkerer → Craftsman",
      gainedChapters: [],
      gainedMusthaves: [],
    };
    expect(formatDeltaBanner(d)).toBe("+11 since last scan · Tinkerer → Craftsman");
  });

  it("formats a positive delta with no tier crossing", () => {
    const d: ScanDelta = { scoreDelta: 4, tierCrossed: null, gainedChapters: [], gainedMusthaves: [] };
    expect(formatDeltaBanner(d)).toBe("+4 since last scan");
  });

  it("formats a negative delta honestly", () => {
    const d: ScanDelta = { scoreDelta: -3, tierCrossed: null, gainedChapters: [], gainedMusthaves: [] };
    expect(formatDeltaBanner(d)).toBe("-3 since last scan");
  });

  it("returns null when scoreDelta is 0 and no tier change", () => {
    const d: ScanDelta = { scoreDelta: 0, tierCrossed: null, gainedChapters: [], gainedMusthaves: [] };
    expect(formatDeltaBanner(d)).toBeNull();
  });

  it("has no em dash in the banner copy", () => {
    const d: ScanDelta = {
      scoreDelta: 11,
      tierCrossed: "Tinkerer → Craftsman",
      gainedChapters: [],
      gainedMusthaves: [],
    };
    const out = formatDeltaBanner(d);
    expect(out).not.toMatch(/—/);
    expect(out).not.toMatch(/–/);
  });
});

describe("loadPreviousScan", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), "bench-delta-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("returns data: null with no parseWarning when the file is missing", async () => {
    const result = await loadPreviousScan(tmpDir);
    expect(result.data).toBeNull();
    expect(result.parseWarning).toBeUndefined();
  });

  it("returns the parsed JSON when bench-scan.json exists and is valid", async () => {
    const payload = { score: 23, tier: "Tinkerer" };
    await fs.writeFile(join(tmpDir, "bench-scan.json"), JSON.stringify(payload));
    const result = await loadPreviousScan(tmpDir);
    expect(result.data).toEqual(payload);
    expect(result.parseWarning).toBeUndefined();
  });

  it("returns data: null with a parseWarning when the file is unparseable JSON", async () => {
    await fs.writeFile(join(tmpDir, "bench-scan.json"), "{ not valid json ");
    const result = await loadPreviousScan(tmpDir);
    expect(result.data).toBeNull();
    expect(result.parseWarning).toBeDefined();
    expect(typeof result.parseWarning).toBe("string");
  });
});
