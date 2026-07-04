import { describe, it, expect } from "vitest";
import { mapperToPersona, titleForTier } from "../src/persona";
import type { Payload } from "../src/payload";

// Full fabricated payload with all fields populated — chapters use 5-slot
// states (matching what scoreFromCounts actually produces), unlike the old
// stub fixture which only needed a subset.
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
  musthaves: [
    "PreToolUse hook: Pre-tool guardrails catch the prompts that would burn time or money before the tool fires.",
    "SessionStart or SessionEnd hook: Boot-time context injection removes the ritual of re-explaining the repo every session.",
  ],
  signature_verbs: ["build", "refactor", "test"],
  tiles: [{ label: "weeks", value: "16", equiv: "" }],
  identity: "You build to learn. You refactor to focus. You keep testing if it fits.",
  hours_meaning: "~29 workdays of pair-programming — whatever you made, you made it together",
  hours_label: "hours with Claude Code",
  chapter_note: "Automation: 60/100 — focus area",
  headline_rarity: null,
  diagnostics: {
    redaction_hits: 0,
    parse_warnings: [],
    skipped_files: 0,
    elapsed_ms: 1234,
  },
  integrity: { client_hmac: "abc123", hmac_key_id: "v1" },
};

describe("mapperToPersona", () => {
  it("maps handle to @-prefixed string and derives initial", () => {
    const persona = mapperToPersona(payloadFixture);
    expect(persona.handle).toBe("@alice");
    expect(persona.initial).toBe("A");
  });

  it("anonymous scan (null handle) gets @anonymous / bullet initial", () => {
    const persona = mapperToPersona({ ...payloadFixture, handle: null });
    expect(persona.handle).toBe("@anonymous");
    expect(persona.initial).toBe("•");
  });

  it("passes through score, tier, weeks verbatim", () => {
    const persona = mapperToPersona(payloadFixture);
    expect(persona.score).toBe(74);
    expect(persona.tier).toBe("Craftsman");
    expect(persona.weeks).toBe(16);
  });

  it("hours falls back to 0 when hours_with_cc is null (hidden)", () => {
    const persona = mapperToPersona({
      ...payloadFixture,
      hours_with_cc: null,
      hours_hidden: true,
    });
    expect(persona.hours).toBe(0);
  });

  it("hours passes through the real value when present", () => {
    const persona = mapperToPersona(payloadFixture);
    expect(persona.hours).toBe(230);
  });

  it("hoursMeaning, identity, chapterNote pass through the payload's own authored copy verbatim (not re-derived)", () => {
    const persona = mapperToPersona(payloadFixture);
    expect(persona.hoursMeaning).toBe(payloadFixture.hours_meaning);
    expect(persona.identity).toBe(payloadFixture.identity);
    expect(persona.chapterNote).toBe(payloadFixture.chapter_note);
  });

  it("signature joins signature_verbs in the 'you X · you Y' shape script.js expects", () => {
    const persona = mapperToPersona(payloadFixture);
    expect(persona.signature).toBe("you build · you refactor · you test");
  });

  it("title is derived from tier via titleForTier", () => {
    const persona = mapperToPersona(payloadFixture);
    expect(persona.title).toBe(titleForTier("Craftsman"));
    expect(persona.title).toBe("You've found your rhythm.");
  });

  it("eyebrow embeds weeks_on_cc", () => {
    const persona = mapperToPersona(payloadFixture);
    expect(persona.eyebrow).toBe("scanned just now · 16 weeks on claude code");
  });

  it("collapses chapterTags partial->weak (only strong/weak ever render)", () => {
    const persona = mapperToPersona(payloadFixture);
    expect(persona.chapterTags).toEqual(["strong", "weak", "weak", "strong", "strong"]);
  });

  it("clusters expose each chapter's full 5-slot states array, keyed by chapter name", () => {
    const persona = mapperToPersona(payloadFixture);
    expect(persona.clusters["Foundation"]).toEqual(["have", "have", "partial", "missing", "have"]);
    expect(persona.clusters["Automation"]).toEqual(["have", "missing", "missing", "have", "partial"]);
    expect(persona.clusters["Delegation"]).toEqual(["have", "partial", "partial", "missing", "have"]);
    expect(persona.clusters["Craft"]).toEqual(["have", "have", "partial", "missing", "have"]);
    expect(persona.clusters["Coherence"]).toEqual(["have", "have", "have", "partial", "missing"]);
  });

  it("musthaves is a 15-slot have/partial/missing array (script.js's static MUSTHAVES length), derived from chapter states by position — NOT the payload's short human-readable musthave strings", () => {
    const persona = mapperToPersona(payloadFixture);
    expect(persona.musthaves).toHaveLength(15);
    expect(persona.musthaves.every((s) => s === "have" || s === "partial" || s === "missing")).toBe(true);
    // Hand-computed expectation from MUSTHAVE_SLOTS against payloadFixture.chapters:
    // Foundation[0,2,3] = have, partial, missing
    // Automation[0,1,3,2] = have, missing, have, missing
    // Delegation[2,0,3,4] = partial, have, missing, have
    // Craft[0,2,4] = have, partial, have
    // Coherence[2] = have
    expect(persona.musthaves).toEqual([
      "have", "partial", "missing",
      "have", "missing", "have", "missing",
      "partial", "have", "missing", "have",
      "have", "partial", "have",
      "have",
    ]);
  });

  it("tiles pass through from payload verbatim", () => {
    const persona = mapperToPersona(payloadFixture);
    expect(persona.tiles).toEqual(payloadFixture.tiles);
  });

  it("is a pure function — same input produces same output", () => {
    const a = mapperToPersona(payloadFixture);
    const b = mapperToPersona(payloadFixture);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("headlineRarity passes through null verbatim (Task D1, today's empty prevalence table)", () => {
    const persona = mapperToPersona(payloadFixture);
    expect(persona.headlineRarity).toBeNull();
  });

  it("headlineRarity passes through a computed rarity line verbatim (extra field, ignored by frozen v1 script.js)", () => {
    const persona = mapperToPersona({
      ...payloadFixture,
      headline_rarity: "Only 8% of 50 public setups benchmarked have a PreToolUse hook. You do.",
    });
    expect(persona.headlineRarity).toBe(
      "Only 8% of 50 public setups benchmarked have a PreToolUse hook. You do.",
    );
  });
});

describe("titleForTier", () => {
  it("maps every known tier to non-empty copy", () => {
    expect(titleForTier("Explorer")).toBe("You're getting started.");
    expect(titleForTier("Tinkerer")).toBe("You've been building.");
    expect(titleForTier("Craftsman")).toBe("You've found your rhythm.");
    expect(titleForTier("Operator")).toBe("You're orchestrating work.");
    expect(titleForTier("Conductor")).toBe("You run a whole studio.");
  });

  it("unknown tier falls back to empty string", () => {
    expect(titleForTier("Unknown")).toBe("");
  });
});
