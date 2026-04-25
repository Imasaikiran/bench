import { describe, it, expect } from "vitest";
import { assemblePayload, canonicalJson } from "../src/payload";

describe("payload", () => {
  it("matches §7.1 shape + size <= 16KB", () => {
    const p = assemblePayload({
      counts: { sessions_total: 100, plan_mode_sessions: 25, skills_total: 6 } as any,
      chapters: { Foundation: { score: 72, states: ["have", "have", "partial", "missing", "missing"] } } as any,
      musthaves: Array(15).fill("missing") as any,
      tier: "Tinkerer", score: 62,
      hours_with_cc: 187, weeks_on_cc: 14,
      signature_verbs: ["install", "prune", "question"],
      identity: "x", hours_meaning: "y", chapter_note: "z",
      handle: null, previous_scan_id: null,
      scanner_version: "0.0.1-alpha.0", rubric_version: "0.1.0",
      diagnostics: { redaction_hits: 0, parse_warnings: [], skipped_files: 0, elapsed_ms: 1200 },
    });
    expect(p.schema_version).toBe("1.0");
    expect(Buffer.byteLength(JSON.stringify(p), "utf8")).toBeLessThanOrEqual(16 * 1024);
    expect(p.integrity.client_hmac).toMatch(/^[a-f0-9]{64}$/);
  });
  it("canonicalJson is deterministic on key order", () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it("HMAC is deterministic with injected now", () => {
    const base = {
      counts: { x: 1 } as any,
      chapters: {} as any,
      musthaves: [] as any,
      tier: "Tinkerer" as const, score: 50,
      hours_with_cc: 100, weeks_on_cc: 10,
      signature_verbs: ["build"], identity: "", hours_meaning: "", chapter_note: "",
      handle: null, previous_scan_id: null,
      scanner_version: "0.0.1", rubric_version: "0.1.0",
      diagnostics: { redaction_hits: 0, parse_warnings: [], skipped_files: 0, elapsed_ms: 0 },
      now: () => "2026-04-25T00:00:00.000Z",
    };
    const a = assemblePayload(base);
    const b = assemblePayload(base);
    expect(a.integrity.client_hmac).toBe(b.integrity.client_hmac);
    expect(a.scanned_at).toBe("2026-04-25T00:00:00.000Z");
  });

  it("HMAC differs when counts changes", () => {
    const base = {
      counts: { x: 1 } as any,
      chapters: {} as any,
      musthaves: [] as any,
      tier: "Tinkerer" as const, score: 50,
      hours_with_cc: 100, weeks_on_cc: 10,
      signature_verbs: ["build"], identity: "", hours_meaning: "", chapter_note: "",
      handle: null, previous_scan_id: null,
      scanner_version: "0.0.1", rubric_version: "0.1.0",
      diagnostics: { redaction_hits: 0, parse_warnings: [], skipped_files: 0, elapsed_ms: 0 },
      now: () => "2026-04-25T00:00:00.000Z",
    };
    const a = assemblePayload(base);
    const b = assemblePayload({ ...base, counts: { x: 2 } as any });
    expect(a.integrity.client_hmac).not.toBe(b.integrity.client_hmac);
  });

  it("chapter_tags thresholds at boundaries", () => {
    const make = (s: number) => assemblePayload({
      counts: {} as any,
      chapters: { Foundation: { score: s, states: [] }, Automation: { score: s, states: [] }, Delegation: { score: s, states: [] }, Craft: { score: s, states: [] }, Coherence: { score: s, states: [] } } as any,
      musthaves: [] as any,
      tier: "Explorer" as const, score: s,
      hours_with_cc: 10, weeks_on_cc: 1,
      signature_verbs: [], identity: "", hours_meaning: "", chapter_note: "",
      handle: null, previous_scan_id: null,
      scanner_version: "0.0.1", rubric_version: "0.1.0",
      diagnostics: { redaction_hits: 0, parse_warnings: [], skipped_files: 0, elapsed_ms: 0 },
      now: () => "2026-04-25T00:00:00.000Z",
    });
    expect(make(39).chapter_tags[0]).toBe("weak");
    expect(make(40).chapter_tags[0]).toBe("partial");
    expect(make(69).chapter_tags[0]).toBe("partial");
    expect(make(70).chapter_tags[0]).toBe("strong");
  });

  it("hours_hidden = true when hours_with_cc is null", () => {
    const p = assemblePayload({
      counts: {} as any, chapters: {} as any, musthaves: [] as any,
      tier: "Explorer" as const, score: 0, weeks_on_cc: 1,
      hours_with_cc: null,
      signature_verbs: [], identity: "", hours_meaning: "", chapter_note: "",
      handle: null, previous_scan_id: null,
      scanner_version: "0.0.1", rubric_version: "0.1.0",
      diagnostics: { redaction_hits: 0, parse_warnings: [], skipped_files: 0, elapsed_ms: 0 },
      now: () => "2026-04-25T00:00:00.000Z",
    });
    expect(p.hours_hidden).toBe(true);
    expect(p.hours_with_cc).toBe(null);
  });

  it("canonicalJson sorts object keys but preserves array order", () => {
    expect(canonicalJson({ b: [2, 1], a: 3 })).toBe('{"a":3,"b":[2,1]}');
  });
});
