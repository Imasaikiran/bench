import { toPersonaShape, type PersonaShape } from "./mapper";

// Synthetic Priya — §5.8 / §7.1. Fictional developer used for explainer pages.
// All numbers are hand-chosen to land in the Tinkerer band with realistic shape.
const priyaPayload = {
  schema_version: "1.0",
  rubric_version: "0.2.0",
  scanner_version: "0.0.1-alpha.0",
  scanned_at: "2026-04-25T12:00:00.000Z",
  handle: "priya_dev",
  previous_scan_id: null,
  os: "darwin",
  node_version: "20.10.0",
  tier: "Tinkerer",
  score: 62,
  weeks_on_cc: 14,
  hours_with_cc: 187,
  hours_hidden: false,
  counts: {},
  chapters: {
    Foundation: { score: 72, states: ["have", "have", "partial", "missing", "missing"] },
    Automation: { score: 10, states: ["missing", "missing", "missing", "missing", "missing"] },
    Delegation: { score: 60, states: ["have", "partial", "have", "missing", "missing"] },
    Craft:      { score: 82, states: ["have", "have", "partial", "have", "missing"] },
    Hygiene:    { score: 76, states: ["have", "have", "partial", "have", "partial"] },
  },
  // Two-state only. v1 script.js maps weak→"Needs work", strong→"Strong".
  // Dropping "partial" removes the ambiguous third "building" label (UX audit §3.3).
  chapter_tags: ["weak", "weak", "weak", "strong", "strong"],
  musthaves: Array(15).fill("missing"),
  signature_verbs: ["install", "prune", "question"],
  tiles: [
    { label: "weeks", value: "14", equiv: "" },
    { label: "skills", value: "6", equiv: "" },
    { label: "prompts", value: "~420", equiv: "" },
    { label: "plan mode", value: "41", equiv: "" },
  ],
  // identity renders as the one-line read under the headline. Make it define
  // the tier instead of restating "Tinkerer at week 14" (which the seal
  // already shows). UX audit §3.2 — kill the duplicate, add the definition.
  identity: "Tinkerer: past the basics, still pruning what doesn't earn its place.",
  hours_meaning: "≈ 23 working days, side by side with Claude Code",
  hours_label: "hours with Claude Code",
  chapter_note: "Weakest area: Automation. Fix that next.",
  diagnostics: {},
  integrity: { client_hmac: "synthetic-no-hmac", hmac_key_id: "v1" as const },
};

export function getDemoPersona(): PersonaShape {
  const persona = toPersonaShape(priyaPayload);
  // Spec override: explainer-page eyebrow.
  return {
    ...persona,
    eyebrow: "synthetic profile · fictional developer · shown for explainer purposes",
  };
}
