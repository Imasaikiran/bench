// web/test/__fixtures__/priya.ts
//
// Shared Priya fixture. Previously copy-pasted across 7 web test files
// (v1render, mapper, claim, demo, sharebar, anomaly, og-render). Surfaced
// as a fixture so the canonical shape lives in one place and drift between
// callers gets caught at compile time.
//
// Two variants:
//   - PRIYA_PERSONA : full v1-frozen PersonaShape contract (§7.2).
//   - PRIYA_OG      : slim OgPayload (just the fields the OG renderer needs).
//
// If a test needs a different value for one field, spread + override:
//   const persona = { ...PRIYA_PERSONA, hours: 0 };

import type { PersonaShape } from "../../lib/mapper";
import type { OgPayload } from "../../lib/og-render";

export const PRIYA_PERSONA: PersonaShape = {
  handle: "@priya_dev",
  initial: "P",
  weeks: 14,
  eyebrow: "scanned just now · 14 weeks on claude code",
  title: "You've been building.",
  tiles: [
    { label: "weeks", value: "14", equiv: "past the honeymoon" },
    { label: "skills", value: "6", equiv: "4 daily · 3 overlap" },
    { label: "prompts", value: "~420", equiv: "saved per month" },
    { label: "plan mode", value: "41", equiv: "runs · every other task" },
  ],
  identity: "You install to learn. You prune to focus. You keep asking if it fits.",
  hours: 187,
  hoursMeaning: "~23 workdays of pair-programming",
  signature: "you install · you prune · you question",
  score: 62,
  tier: "Tinkerer",
  chapterNote: "Automation is dark. The fastest lever you have.",
  chapterTags: ["partial", "weak", "partial", "strong", "strong"],
  clusters: {
    Foundation: ["have", "have", "partial", "missing", "missing"],
    Automation: ["missing", "missing", "missing", "missing", "missing"],
    Delegation: ["have", "partial", "have", "missing", "missing"],
    Craft:      ["have", "have", "partial", "have", "missing"],
    Coherence:  ["have", "have", "partial", "have", "partial"],
  },
  musthaves: [
    "have", "partial", "missing", "missing", "missing",
    "missing", "missing", "have", "partial", "missing",
    "missing", "have", "partial", "missing", "missing",
  ],
};

export const PRIYA_OG: OgPayload = {
  hours_with_cc: 187,
  score: 62,
  tier: "Tinkerer",
  signature_verbs: ["install", "prune", "question"],
  handle: "priya_dev",
};
