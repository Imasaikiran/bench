import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { writeLocalExport, substituteTemplate } from "../src/local-export.js";
import type { Payload } from "../src/payload.js";

// Minimal valid payload for testing
function makePayload(): Payload {
  return {
    schema_version: "1.0",
    rubric_version: "0.1.0",
    scanner_version: "0.0.1-alpha.0",
    scanned_at: "2026-04-26T00:00:00.000Z",
    handle: null,
    previous_scan_id: null,
    os: "linux",
    node_version: "20.0.0",
    tier: "Tinkerer",
    score: 62,
    weeks_on_cc: 14,
    hours_with_cc: 187,
    hours_hidden: false,
    counts: { sessions_total: 100 },
    chapters: { Foundation: { score: 72, states: ["have"] } },
    chapter_tags: ["strong", "weak", "weak", "weak", "weak"],
    musthaves: [],
    signature_verbs: ["install", "prune"],
    tiles: [],
    identity: "test identity",
    hours_meaning: "test meaning",
    hours_label: "hours with Claude Code",
    chapter_note: "test note",
    diagnostics: {
      redaction_hits: 0,
      parse_warnings: [],
      skipped_files: 0,
      elapsed_ms: 1200,
    },
    integrity: { client_hmac: "abc123".repeat(10) + "abcd", hmac_key_id: "v1" },
  };
}

const testPersona = {
  tier: "Tinkerer",
  score: 62,
  label: "Test persona",
  note: "it's a test",
};

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(join(tmpdir(), "bench-local-export-test-"));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("writeLocalExport", () => {
  it("writes bench-scan.json and bench-scan.html to dir", async () => {
    await writeLocalExport(tmpDir, makePayload(), testPersona);
    const files = await fs.readdir(tmpDir);
    expect(files).toContain("bench-scan.json");
    expect(files).toContain("bench-scan.html");
  });

  it("bench-scan.json round-trips to the input payload", async () => {
    const payload = makePayload();
    await writeLocalExport(tmpDir, payload, testPersona);
    const raw = await fs.readFile(join(tmpDir, "bench-scan.json"), "utf8");
    expect(JSON.parse(raw)).toEqual(payload);
  });

  it("HTML contains <style> tag (CSS inlined)", async () => {
    await writeLocalExport(tmpDir, makePayload(), testPersona);
    const html = await fs.readFile(join(tmpDir, "bench-scan.html"), "utf8");
    expect(html).toContain("<style>");
  });

  it("HTML contains window.__BENCH_PERSONA__ assignment", async () => {
    await writeLocalExport(tmpDir, makePayload(), testPersona);
    const html = await fs.readFile(join(tmpDir, "bench-scan.html"), "utf8");
    expect(html).toContain("window.__BENCH_PERSONA__ =");
  });

  it("HTML inlined <style> body is non-empty (CSS slot populated)", async () => {
    await writeLocalExport(tmpDir, makePayload(), testPersona);
    const html = await fs.readFile(join(tmpDir, "bench-scan.html"), "utf8");
    // Structural check: works whether assets are stubs or real v1 frontend (Task 1.21).
    const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
    expect(styleMatch?.[1]?.trim().length).toBeGreaterThan(0);
  });

  it("HTML second <script> body is non-empty (JS slot populated)", async () => {
    await writeLocalExport(tmpDir, makePayload(), testPersona);
    const html = await fs.readFile(join(tmpDir, "bench-scan.html"), "utf8");
    // Structural check: first <script> is persona; second is the inlined JS bundle.
    const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)];
    expect(scripts.length).toBeGreaterThanOrEqual(2);
    expect(scripts[1]?.[1]?.trim().length).toBeGreaterThan(0);
  });

  it("persona JSON round-trips correctly after extraction from HTML", async () => {
    await writeLocalExport(tmpDir, makePayload(), testPersona);
    const html = await fs.readFile(join(tmpDir, "bench-scan.html"), "utf8");

    // Extract the JSON between "window.__BENCH_PERSONA__ = " and ";</script>"
    const marker = "window.__BENCH_PERSONA__ = ";
    const startIdx = html.indexOf(marker);
    expect(startIdx).toBeGreaterThan(-1);

    const afterMarker = html.slice(startIdx + marker.length);
    const endIdx = afterMarker.indexOf(";</script>");
    expect(endIdx).toBeGreaterThan(-1);

    const personaJson = afterMarker.slice(0, endIdx);
    expect(JSON.parse(personaJson)).toEqual(testPersona);
  });

  it("HTML has no external src= or href=http attributes (fully self-contained)", async () => {
    await writeLocalExport(tmpDir, makePayload(), testPersona);
    const html = await fs.readFile(join(tmpDir, "bench-scan.html"), "utf8");

    // Should not contain any external resource references
    expect(html).not.toMatch(/\bsrc\s*=\s*["']https?:/i);
    expect(html).not.toMatch(/\bhref\s*=\s*["']https?:/i);
  });

  it("throws when dir does not exist", async () => {
    const nonExistentDir = join(tmpDir, "does-not-exist");
    await expect(
      writeLocalExport(nonExistentDir, makePayload(), testPersona),
    ).rejects.toThrow("does not exist");
  });

  it("is idempotent — second call overwrites without error", async () => {
    const payload = makePayload();
    await writeLocalExport(tmpDir, payload, testPersona);
    // Second call should succeed and produce identical output
    await writeLocalExport(tmpDir, payload, testPersona);
    const raw = await fs.readFile(join(tmpDir, "bench-scan.json"), "utf8");
    expect(JSON.parse(raw)).toEqual(payload);
  });

  // I-1: HTML-script-context escaping prevents </script> injection
  it("I-1: persona containing </script> is escaped — no raw </script> injected into HTML", async () => {
    const xssPersona = { note: "</script><script>alert(1)</script>" };
    await writeLocalExport(tmpDir, makePayload(), xssPersona);
    const html = await fs.readFile(join(tmpDir, "bench-scan.html"), "utf8");

    // The dangerous literal must NOT appear verbatim inside the script tag
    expect(html).not.toContain("</script><script>alert(1)</script>");
    // The escaped form must be present: < → \u003c (literal 6-char sequence in HTML source)
    // Note: > is not required to be escaped; only < is dangerous in script context.
    expect(html).toContain("\\u003c/script>");

    // Round-trip: the JSON.parse of the escaped value still deep-equals the input
    const marker = "window.__BENCH_PERSONA__ = ";
    const startIdx = html.indexOf(marker);
    expect(startIdx).toBeGreaterThan(-1);
    const afterMarker = html.slice(startIdx + marker.length);
    // Find the closing ";</script>" that belongs to our persona script block
    const endIdx = afterMarker.indexOf(";</script>");
    expect(endIdx).toBeGreaterThan(-1);
    const personaJson = afterMarker.slice(0, endIdx);
    expect(JSON.parse(personaJson)).toEqual(xssPersona);
  });
});

// I-2: substituteTemplate — single-pass, no chain replacement
describe("substituteTemplate", () => {
  it("substitutes all three tokens in a single pass", () => {
    const tpl = "<s>/*__STYLES__*/</s><j>/*__SCRIPT__*/</j><p>__PERSONA_JSON__</p>";
    const result = substituteTemplate(tpl, "CSS", "JS", '"persona"');
    expect(result).toBe('<s>CSS</s><j>JS</j><p>"persona"</p>');
  });

  it("does not chain-replace: CSS containing __PERSONA_JSON__ literal is left intact", () => {
    // If chain replacement were used, the __PERSONA_JSON__ inside the CSS value
    // would be replaced again in a later pass. Single-pass prevents this.
    const tpl = "/*__STYLES__*/ __PERSONA_JSON__";
    const css = "body { content: '__PERSONA_JSON__'; }";
    const result = substituteTemplate(tpl, css, "", '"safe"');
    // The __PERSONA_JSON__ inside the css value must NOT be substituted;
    // only the original template token (separated by a space) becomes "safe".
    expect(result).toBe("body { content: '__PERSONA_JSON__'; } \"safe\"");
  });

  it("does not chain-replace: JS containing /*__STYLES__*/ literal is left intact", () => {
    const tpl = "/*__SCRIPT__*/ /*__STYLES__*/";
    const js = "/* token: /*__STYLES__*/ */";
    const result = substituteTemplate(tpl, "real-css", js, "{}");
    // Only the template token /*__STYLES__*/ is replaced; the one inside js is untouched.
    expect(result).toBe("/* token: /*__STYLES__*/ */ real-css");
  });
});

// C-1: source assets layout — proves writeLocalExport can find all three files
describe("source assets layout", () => {
  it("all three asset files exist at the path writeLocalExport resolves to at runtime", async () => {
    // This test mirrors the runtime resolution: dist/index.js → dist/assets/
    // Here the test file is cli/test/local-export.test.ts → cli/src/assets/
    const srcAssetsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "assets");
    await expect(fs.access(join(srcAssetsDir, "offline-template.html"))).resolves.toBeUndefined();
    await expect(fs.access(join(srcAssetsDir, "styles.css"))).resolves.toBeUndefined();
    await expect(fs.access(join(srcAssetsDir, "script.js"))).resolves.toBeUndefined();
  });
});
