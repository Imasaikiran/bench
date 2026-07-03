import { describe, it, expect, vi, beforeEach } from "vitest";
import { main } from "../src/index";
import type { Deps, IO } from "../src/index";
import type { Payload } from "../src/payload";
import type { ScoreResult } from "../src/rubric/score";
import type { Rubric } from "../src/rubric/load";
import type { ConsentOutput } from "../src/consent";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const RUBRIC: Rubric = {
  version: "0.1.0",
  chapters: {
    Foundation: {
      dimensions: [
        { id: 1, name: "Root CLAUDE.md", weight: 1.0 },
        { id: 2, name: "settings.json", weight: 1.0 },
        { id: 3, name: "permissions allowlist", weight: 1.0 },
        { id: 4, name: "sub-dir CLAUDE.md", weight: 0.8 },
        { id: 5, name: "Docs in .claude", weight: 0.4 },
      ],
    },
    Automation: {
      dimensions: [
        { id: 6, name: "PostToolUse hook", weight: 1.0 },
        { id: 7, name: "PreToolUse hook", weight: 1.0 },
        { id: 8, name: "SessionStart hook", weight: 0.8 },
        { id: 9, name: "Custom slash commands", weight: 0.8 },
        { id: 10, name: "Automation events fired", weight: 0.6 },
      ],
    },
    Delegation: {
      dimensions: [
        { id: 11, name: "Skills (>=3)", weight: 1.0 },
        { id: 12, name: "Pruned skills", weight: 1.0 },
        { id: 13, name: "GitHub MCP", weight: 0.8 },
        { id: 14, name: "Code-review subagent", weight: 0.8 },
        { id: 15, name: "Test-runner subagent", weight: 0.6 },
      ],
    },
    Craft: {
      dimensions: [
        { id: 16, name: "Plan mode used", weight: 1.0 },
        { id: 17, name: "Reads craft", weight: 0.6 },
        { id: 18, name: "Worktrees", weight: 0.6 },
        { id: 19, name: "Commit discipline", weight: 0.8 },
        { id: 20, name: "Verification before commit", weight: 1.0 },
      ],
    },
    Coherence: {
      dimensions: [
        { id: 21, name: "Focus", weight: 0.6 },
        { id: 22, name: "Clean .claude/", weight: 0.8 },
        { id: 23, name: "No-bloat", weight: 1.0 },
        { id: 24, name: "Names", weight: 0.6 },
        { id: 25, name: "Single-topic CLAUDE.md", weight: 0.6 },
      ],
    },
  },
};

const SCORED: ScoreResult = {
  score: 62,
  chapters: {
    Foundation: { score: 72, states: ["have", "partial", "missing", "missing", "have"] },
    Automation: { score: 40, states: ["have", "missing", "missing", "partial", "missing"] },
    Delegation: { score: 60, states: ["have", "have", "partial", "missing", "missing"] },
    Craft: { score: 65, states: ["have", "have", "missing", "partial", "have"] },
    Coherence: { score: 70, states: ["have", "have", "have", "partial", "missing"] },
  },
};

const PAYLOAD: Payload = {
  schema_version: "1.0",
  rubric_version: "0.1.0",
  scanner_version: "0.0.1-alpha.0",
  scanned_at: "2026-04-25T00:00:00.000Z",
  handle: null,
  previous_scan_id: null,
  os: "darwin",
  node_version: "20.0.0",
  tier: "Tinkerer",
  score: 62,
  weeks_on_cc: 6,
  hours_with_cc: 80,
  hours_hidden: false,
  counts: { sessions_total: 40, weeks_on_cc: 6, active_hours_total: 80 },
  chapters: SCORED.chapters,
  chapter_tags: ["strong", "partial", "partial", "partial", "partial"],
  musthaves: ["PreToolUse hook: Pre-tool guardrails catch the prompts that would burn time or money before the tool fires."],
  signature_verbs: ["build"],
  tiles: [],
  identity: "You build.",
  hours_meaning: "~10 workdays",
  hours_label: "hours with Claude Code",
  chapter_note: "Automation: 40/100 — focus area",
  diagnostics: { redaction_hits: 0, parse_warnings: [], skipped_files: 0, elapsed_ms: 10 },
  integrity: { client_hmac: "abc", hmac_key_id: "v1" },
};

const SCAN_RESULT = {
  counts: { sessions_total: 40, weeks_on_cc: 6, active_hours_total: 80 },
  diagnostics: { redaction_hits: 0, parse_warnings: [], skipped_files: 0, elapsed_ms: 0 },
  confidence: { tool_derived: "high" as const },
  raw: {
    cfg: { claudeMd: null, settings: {}, settingsLocal: {}, parseWarnings: [] },
    skills: { total: 0, items: [], parseWarnings: [] },
    hooks: { configured: 0, orphaned: 0, events: {}, parseWarnings: [] },
    cmds: { total: 0, parseWarnings: [] },
    agents: { total: 0, reviewAgent: false, testAgent: false, parseWarnings: [] },
    mcp: { servers: [], hasGithub: false, parseWarnings: [] },
    sessions: {
      sessionsTotal: 40,
      planModeSessions: 5,
      weeksOnCc: 6,
      activeSecondsTotal: 80 * 3600,
      readBytesSum: 0,
      readBytesCount: 0,
      usedSkills: [],
      projectRoots: [],
      parseWarnings: [],
    },
    git: {
      conventionalRatio: 0.5,
      signatureVerbs: ["build"],
      commitBurstCorrelation: 0.2,
      commitsTotal: 10,
      skipped: [],
    },
  },
};

/**
 * Build a Deps object with all side-effectful functions stubbed to sensible defaults.
 * Individual tests override only the deps they care about.
 */
function makeDeps(overrides: Partial<Deps> = {}): Deps {
  return {
    parseArgs: vi.fn().mockReturnValue({
      version: false,
      why: false,
      offline: false,
      handle: null,
      debug: false,
      dryRun: false,
      rubric: null,
    }),
    detectEnvironment: vi.fn().mockReturnValue({
      isRoot: false,
      isCI: false,
      claudeHome: "/fake/.claude",
      claudeHomeOverridden: false,
    }),
    refuseIfUnsafe: vi.fn(),
    loadRubric: vi.fn().mockReturnValue(RUBRIC),
    scan: vi.fn().mockResolvedValue(SCAN_RESULT),
    scoreFromCounts: vi.fn().mockReturnValue(SCORED),
    inferTier: vi.fn().mockReturnValue("Tinkerer"),
    computeHoursWithCc: vi.fn().mockReturnValue(80),
    deriveCopy: vi.fn().mockReturnValue({
      signature_verbs: ["build"],
      identity: "You build.",
      hours_meaning: "~10 workdays",
      hours_label: "hours with Claude Code",
    }),
    assemblePayload: vi.fn().mockReturnValue(PAYLOAD),
    formatWhy: vi.fn().mockReturnValue("Foundation 72/100\n  #1 Root CLAUDE.md ... have"),
    renderPreview: vi.fn().mockReturnValue("80h\n  hours with Claude Code\n\nBench 62 · Tinkerer · Wk 6"),
    askConsent: vi.fn().mockResolvedValue({ upload: true } satisfies ConsentOutput),
    upload: vi.fn().mockResolvedValue({ id: "scan-1", url: "https://bench.dev/u/alice/1" }),
    openUrl: vi.fn(),
    writeLocalExport: vi.fn().mockResolvedValue(undefined),
    mapperToPersona: vi.fn().mockReturnValue({ score: 62 }),
    ttyPrompt: vi.fn().mockResolvedValue("y"),
    ...overrides,
  };
}

function makeIO(): { io: IO; lines: string[]; errLines: string[] } {
  const lines: string[] = [];
  const errLines: string[] = [];
  return {
    io: {
      stdout: (s: string) => lines.push(s),
      stderr: (s: string) => errLines.push(s),
    },
    lines,
    errLines,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("main --version", () => {
  it("returns 0 and prints bench v... and rubric v...", async () => {
    const deps = makeDeps({
      parseArgs: vi.fn().mockReturnValue({
        version: true,
        why: false,
        offline: false,
        handle: null,
        debug: false,
        dryRun: false,
        rubric: null,
      }),
    });
    const { io, lines } = makeIO();
    const code = await main(["--version"], io, deps);
    expect(code).toBe(0);
    expect(lines.join("\n")).toMatch(/bench v\d+\.\d+\.\d+/);
    // scan should NOT be called — version is a pre-scan shortcut
    expect(deps.scan).not.toHaveBeenCalled();
  });
});

describe("main --why", () => {
  it("calls formatWhy, prints output, returns 0 before preview/consent/upload", async () => {
    const deps = makeDeps({
      parseArgs: vi.fn().mockReturnValue({
        version: false,
        why: true,
        offline: false,
        handle: null,
        debug: false,
        dryRun: false,
        rubric: null,
      }),
    });
    const { io, lines } = makeIO();
    const code = await main(["--why"], io, deps);
    expect(code).toBe(0);
    expect(deps.formatWhy).toHaveBeenCalledOnce();
    // Why output should appear in stdout
    const combined = lines.join("\n");
    expect(combined).toContain("Foundation");
    // No upload or consent
    expect(deps.upload).not.toHaveBeenCalled();
    expect(deps.askConsent).not.toHaveBeenCalled();
    // No preview either
    expect(deps.renderPreview).not.toHaveBeenCalled();
  });
});

describe("main --offline", () => {
  it("writes local export, returns 0, no upload call", async () => {
    const deps = makeDeps({
      parseArgs: vi.fn().mockReturnValue({
        version: false,
        why: false,
        offline: true,
        handle: null,
        debug: false,
        dryRun: false,
        rubric: null,
      }),
    });
    const { io, lines } = makeIO();
    const code = await main(["--offline"], io, deps);
    expect(code).toBe(0);
    expect(deps.writeLocalExport).toHaveBeenCalledOnce();
    expect(deps.upload).not.toHaveBeenCalled();
    expect(deps.askConsent).not.toHaveBeenCalled();
    expect(lines.join("\n")).toContain("bench-scan");
  });
});

describe("main --dry-run", () => {
  it("returns 0 without consent prompt or upload", async () => {
    const deps = makeDeps({
      parseArgs: vi.fn().mockReturnValue({
        version: false,
        why: false,
        offline: false,
        handle: null,
        debug: false,
        dryRun: true,
        rubric: null,
      }),
    });
    const { io } = makeIO();
    const code = await main(["--dry-run"], io, deps);
    expect(code).toBe(0);
    expect(deps.askConsent).not.toHaveBeenCalled();
    expect(deps.upload).not.toHaveBeenCalled();
    expect(deps.writeLocalExport).not.toHaveBeenCalled();
  });
});

describe("main consent NO", () => {
  it("writes local export and does NOT call upload", async () => {
    const deps = makeDeps({
      askConsent: vi.fn().mockResolvedValue({ upload: false } satisfies ConsentOutput),
    });
    const { io, lines } = makeIO();
    const code = await main([], io, deps);
    expect(code).toBe(0);
    expect(deps.upload).not.toHaveBeenCalled();
    expect(deps.writeLocalExport).toHaveBeenCalledOnce();
    expect(lines.join("\n")).toContain("not uploaded");
  });
});

describe("main consent YES + upload success", () => {
  it("calls upload, opens browser, returns 0", async () => {
    const deps = makeDeps({
      askConsent: vi.fn().mockResolvedValue({ upload: true } satisfies ConsentOutput),
      upload: vi
        .fn()
        .mockResolvedValue({ id: "scan-42", url: "https://bench.dev/u/alice/42" }),
    });
    const { io, lines } = makeIO();
    const code = await main([], io, deps);
    expect(code).toBe(0);
    expect(deps.upload).toHaveBeenCalledOnce();
    expect(deps.openUrl).toHaveBeenCalledWith("https://bench.dev/u/alice/42");
    expect(lines.join("\n")).toContain("https://bench.dev/u/alice/42");
    expect(deps.writeLocalExport).not.toHaveBeenCalled();
  });
});

describe("main upload failure", () => {
  it("logs error, writes local export, returns 1", async () => {
    const deps = makeDeps({
      askConsent: vi.fn().mockResolvedValue({ upload: true } satisfies ConsentOutput),
      upload: vi.fn().mockRejectedValue(new Error("network timeout")),
    });
    const { io, errLines } = makeIO();
    const code = await main([], io, deps);
    expect(code).toBe(1);
    expect(deps.writeLocalExport).toHaveBeenCalledOnce();
    expect(errLines.join("\n")).toContain("upload failed");
    expect(errLines.join("\n")).toContain("network timeout");
  });
});

describe("main refuseIfUnsafe throws", () => {
  it("propagates the error (does not return 0)", async () => {
    const deps = makeDeps({
      refuseIfUnsafe: vi.fn().mockImplementation(() => {
        throw new Error("Run bench as your normal user, not root.");
      }),
    });
    const { io } = makeIO();
    // The error should propagate as a rejected promise.
    await expect(main([], io, deps)).rejects.toThrow(
      "Run bench as your normal user, not root.",
    );
  });
});
