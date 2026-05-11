/**
 * Parity test: cli/src/persona.ts vs web/lib/mapper.ts.
 * Both files contain identical logic; this test catches future drift.
 * Pattern mirrors web/test/rubric-parity.test.ts.
 */
import { describe, it, expect } from "vitest";
import {
  toPersonaShape as cliToPersonaShape,
  deriveHoursMeaning as cliDeriveHoursMeaning,
  titleForTier as cliTitleForTier,
} from "../src/persona";
import {
  toPersonaShape as webToPersonaShape,
  deriveHoursMeaning as webDeriveHoursMeaning,
  titleForTier as webTitleForTier,
} from "../../web/lib/mapper";

// Fabricated payload that exercises all PersonaShape fields.
const FIXTURE = {
  schema_version: "1.0",
  rubric_version: "0.1.0",
  scanner_version: "0.0.1",
  scanned_at: "2026-04-25T00:00:00.000Z",
  handle: "alice",
  tier: "Craftsman",
  score: 74,
  weeks_on_cc: 16,
  hours_with_cc: 230,
  hours_hidden: false,
  counts: {},
  chapters: {
    Foundation:  { score: 80, states: ["have", "have", "partial", "missing", "have"] },
    Automation:  { score: 60, states: ["have", "missing", "missing", "have", "partial"] },
    Delegation:  { score: 70, states: ["have", "partial", "partial", "missing", "have"] },
    Craft:       { score: 75, states: ["have", "have", "partial", "missing", "have"] },
    Coherence:   { score: 85, states: ["have", "have", "have", "partial", "missing"] },
  },
  chapter_tags: ["strong", "partial", "partial", "strong", "strong"],
  musthaves: ["#7 PreToolUse hook", "#8 SessionStart hook"],
  signature_verbs: ["build", "refactor", "test"],
  tiles: [
    { label: "weeks",     value: "16",   equiv: "" },
    { label: "skills",    value: "6",    equiv: "" },
    { label: "prompts",   value: "~420", equiv: "" },
    { label: "plan mode", value: "10",   equiv: "" },
  ],
  identity: "You build to learn.",
  hours_meaning: "~29 workdays",
  hours_label: "hours with Claude Code",
  chapter_note: "Automation: 60/100 — focus area",
};

describe("persona parity (cli vs web)", () => {
  it("toPersonaShape produces identical output", () => {
    expect(cliToPersonaShape(FIXTURE)).toEqual(webToPersonaShape(FIXTURE));
  });

  it("anonymous handle produces identical output", () => {
    const anon = { ...FIXTURE, handle: null };
    expect(cliToPersonaShape(anon)).toEqual(webToPersonaShape(anon));
  });

  it("null hours_with_cc produces identical output", () => {
    const noHours = { ...FIXTURE, hours_with_cc: null, hours_hidden: true };
    expect(cliToPersonaShape(noHours)).toEqual(webToPersonaShape(noHours));
  });
});

describe("deriveHoursMeaning parity (cli vs web)", () => {
  const SAMPLES = [0, -1, NaN, 1, 7, 8, 24, 39, 40, 79, 80, 187, 3120];
  for (const h of SAMPLES) {
    it(`h=${h}`, () => {
      expect(cliDeriveHoursMeaning(h)).toBe(webDeriveHoursMeaning(h));
    });
  }
});

describe("titleForTier parity (cli vs web)", () => {
  const TIERS = ["Explorer", "Tinkerer", "Craftsman", "Operator", "Conductor", "Unknown"];
  for (const t of TIERS) {
    it(`tier=${t}`, () => {
      expect(cliTitleForTier(t)).toBe(webTitleForTier(t));
    });
  }
});
