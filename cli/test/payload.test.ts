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
});
