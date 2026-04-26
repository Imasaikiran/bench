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

describe("deriveHoursMeaning", () => {
  it("zero or negative → 'no time back yet'", () => {
    expect(deriveHoursMeaning(0)).toBe("no time back yet");
    expect(deriveHoursMeaning(-5)).toBe("no time back yet");
    expect(deriveHoursMeaning(NaN)).toBe("no time back yet");
  });
  it("singular hour at h=1", () => {
    expect(deriveHoursMeaning(1)).toBe("1 hour back — almost a workday");
  });
  it("sub-workday under 8h", () => {
    expect(deriveHoursMeaning(7)).toBe("7 hours back — almost a workday");
  });
  it("singular workday at h=8", () => {
    expect(deriveHoursMeaning(8)).toBe("8h back — about 1 workday");
  });
  it("plural workdays in <5wd band", () => {
    expect(deriveHoursMeaning(24)).toBe("24h back — about 3 workdays");
  });
  it("upper edge of <5wd band (h=39)", () => {
    expect(deriveHoursMeaning(39)).toMatch(/about 5 workdays/);
  });
  it("sprint band at h=40", () => {
    expect(deriveHoursMeaning(40)).toBe("40h back — a sprint of workdays (5)");
  });
  it("upper edge of sprint band (h=79)", () => {
    expect(deriveHoursMeaning(79)).toBe("79h back — a sprint of workdays (10)");
  });
  it("side-project band at h=80", () => {
    expect(deriveHoursMeaning(80)).toBe("80h back — 10 workdays, or a side-project shipped");
  });
  it("spec fixture h=187", () => {
    expect(deriveHoursMeaning(187)).toBe("187h back — 23 workdays, or a side-project shipped");
  });
});
