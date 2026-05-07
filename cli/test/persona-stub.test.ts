import { describe, it, expect } from "vitest";
import { mapperToPersona } from "../src/persona-stub";
import type { Payload } from "../src/payload";

// Full fabricated payload with all fields populated.
const payloadFixture: Payload = {
  schema_version: "1.0",
  rubric_version: "0.1.0",
  scanner_version: "0.0.1-alpha.0",
  scanned_at: "2026-04-25T00:00:00.000Z",
  handle: "alice",
  previous_scan_id: null,
  os: "darwin",
  node_version: "20.0.0",
  tier: "Craftsman",
  score: 74,
  weeks_on_cc: 16,
  hours_with_cc: 230,
  hours_hidden: false,
  counts: { sessions_total: 80 },
  chapters: {
    Foundation: { score: 80, states: ["have", "have", "partial", "missing", "have"] },
    Automation: { score: 60, states: ["have", "missing", "missing", "have", "partial"] },
    Delegation: { score: 70, states: ["have", "partial", "partial", "missing", "have"] },
    Craft: { score: 75, states: ["have", "have", "partial", "missing", "have"] },
    Coherence: { score: 85, states: ["have", "have", "have", "partial", "missing"] },
  },
  chapter_tags: ["strong", "partial", "partial", "strong", "strong"],
  musthaves: ["#7 PreToolUse hook", "#8 SessionStart hook"],
  signature_verbs: ["build", "refactor", "test"],
  tiles: [],
  identity: "You build to learn. You refactor to focus. You keep testing if it fits.",
  hours_meaning: "~29 workdays of pair-programming — whatever you made, you made it together",
  hours_label: "hours with Claude Code",
  chapter_note: "Automation: 60/100 — focus area",
  diagnostics: {
    redaction_hits: 0,
    parse_warnings: [],
    skipped_files: 0,
    elapsed_ms: 1234,
  },
  integrity: { client_hmac: "abc123", hmac_key_id: "v1" },
};

describe("mapperToPersona", () => {
  it("maps all required fields from payload", () => {
    const persona = mapperToPersona(payloadFixture) as Record<string, unknown>;

    expect(persona).toEqual({
      score: payloadFixture.score,
      tier: payloadFixture.tier,
      handle: payloadFixture.handle,
      identity: payloadFixture.identity,
      signature_verbs: payloadFixture.signature_verbs,
      hours: payloadFixture.hours_with_cc,
      hours_meaning: payloadFixture.hours_meaning,
      chapters: payloadFixture.chapters,
    });
  });

  it("is a pure function — same input produces same output", () => {
    const a = mapperToPersona(payloadFixture);
    const b = mapperToPersona(payloadFixture);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("passes through null handle", () => {
    const p = { ...payloadFixture, handle: null };
    const persona = mapperToPersona(p) as Record<string, unknown>;
    expect(persona["handle"]).toBe(null);
  });

  it("passes through null hours_with_cc", () => {
    const p = { ...payloadFixture, hours_with_cc: null, hours_hidden: true };
    const persona = mapperToPersona(p) as Record<string, unknown>;
    expect(persona["hours"]).toBe(null);
  });
});
