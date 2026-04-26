import { describe, it, expect } from "vitest";
import { toPersonaShape } from "../lib/mapper";

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
      Coherence:  { score: 76, states: ["have","have","partial","have","partial"] }
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
    expect(p.hoursMeaning).toContain("workdays");
    expect(p.signature).toContain("install");
    expect(p.tiles).toHaveLength(4);
    expect(p.chapterTags).toHaveLength(5);
    expect(p.clusters.Foundation).toHaveLength(5);
    expect(p.musthaves).toHaveLength(15);
  });
  it("anonymous scan has anonymous handle", () => {
    const p = toPersonaShape({ ...payload, handle: null });
    expect(p.handle).toBe("@anonymous");
    expect(p.initial).toBe("•");
  });
});
