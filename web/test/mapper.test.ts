import { describe, it, expect } from "vitest";
import { toPersonaShape, deriveHoursMeaning } from "../lib/mapper";

describe("toPersonaShape", () => {
  const payload = {
    schema_version: "1.0", rubric_version: "0.1.0", scanner_version: "0.0.1-alpha.0",
    scanned_at: "2026-04-25T12:00:00.000Z",
    handle: "priya_dev", tier: "Tinkerer", score: 62,
    weeks_on_cc: 14, hours_with_cc: 187, hours_hidden: false,
    counts: { skills_total: 6, skills_active: 4 },
    chapters: {
      Foundation: { score: 72, states: ["have","have","partial","missing","missing"] },
      Automation: { score: 10, states: ["missing","missing","missing","missing","missing"] },
      Delegation: { score: 60, states: ["have","partial","have","missing","missing"] },
      Craft:      { score: 82, states: ["have","have","partial","have","missing"] },
      Hygiene:    { score: 76, states: ["have","have","partial","have","partial"] }
    },
    chapter_tags: ["partial","weak","partial","strong","strong"],
    musthaves: Array(15).fill("missing"),
    signature_verbs: ["install","prune","question"],
    tiles: [{label:"weeks",value:"14",equiv:""},{label:"skills",value:"6",equiv:""},{label:"prompts",value:"~420",equiv:""},{label:"plan mode",value:"41",equiv:""}],
    identity: "x", hours_meaning: "y", hours_label: "hours with Claude Code", chapter_note: "z"
  } as any;

  it("binary-compat with v1 persona shape", () => {
    const p = toPersonaShape(payload);
    expect(p.handle).toBe("@priya_dev");
    expect(p.initial).toBe("P");
    expect(p.weeks).toBe(14);
    expect(p.hours).toBe(187);
    expect(p.hoursMeaning).toContain("working days");
    expect(p.signature).toContain("install");
    expect(p.tiles).toHaveLength(4);
    expect(p.chapterTags).toHaveLength(5);
    // UX audit §3.3 — only two chapter states ever render now.
    expect(p.chapterTags.every((t) => t === "strong" || t === "weak")).toBe(true);
    expect(p.clusters.Foundation).toHaveLength(5);
    expect(p.musthaves).toHaveLength(15);
  });
  it("anonymous scan has anonymous handle", () => {
    const p = toPersonaShape({ ...payload, handle: null });
    expect(p.handle).toBe("@anonymous");
    expect(p.initial).toBe("•");
  });
});

// UX audit §3.1 — honest workday-equivalent, no "saved"/"gave back" overclaim,
// no "side-project shipped" speculation.
describe("deriveHoursMeaning", () => {
  it("zero or negative → no-history copy", () => {
    expect(deriveHoursMeaning(0)).toBe("not enough history yet");
    expect(deriveHoursMeaning(-5)).toBe("not enough history yet");
    expect(deriveHoursMeaning(NaN)).toBe("not enough history yet");
  });
  it("rounds up to at least one working day", () => {
    expect(deriveHoursMeaning(1)).toBe("≈ 1 working day, side by side with Claude Code");
    expect(deriveHoursMeaning(7)).toBe("≈ 1 working day, side by side with Claude Code");
  });
  it("singular working day at h=8", () => {
    expect(deriveHoursMeaning(8)).toBe("≈ 1 working day, side by side with Claude Code");
  });
  it("plural working days", () => {
    expect(deriveHoursMeaning(24)).toBe("≈ 3 working days, side by side with Claude Code");
  });
  it("no overclaim language at any magnitude", () => {
    const big = deriveHoursMeaning(187);
    expect(big).toBe("≈ 23 working days, side by side with Claude Code");
    expect(big).not.toMatch(/back|saved|gave|side-project/);
  });
});
