import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "node:crypto";

// Mock db + ratelimit BEFORE importing the route.
// db's module-load-time throw (DATABASE_URL check) is bypassed by the mock.
vi.mock("../lib/db", () => ({ sql: vi.fn(async () => [{ id: "x" }]) }));
vi.mock("../lib/ratelimit", () => ({
  hashIp: (ip: string) => `h:${ip}`,
  rateLimitOk: vi.fn(async () => ({ ok: true, retryAfterSec: 3600 })),
}));

import { POST } from "../app/api/scan/route";
import { rateLimitOk } from "../lib/ratelimit";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BUNDLED_HMAC_KEY = "bench-v1-integrity-key-public-do-not-treat-as-secret";

function canonicalJson(v: unknown): string {
  if (v === undefined) throw new Error("undefined not representable");
  if (v === null) return "null";
  if (typeof v === "number") return JSON.stringify(v);
  if (typeof v === "string" || typeof v === "boolean") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(canonicalJson).join(",") + "]";
  const obj = v as Record<string, unknown>;
  return (
    "{" +
    Object.keys(obj)
      .sort()
      .map((k) => JSON.stringify(k) + ":" + canonicalJson(obj[k]))
      .join(",") +
    "}"
  );
}

function computeHmacFor(counts: Record<string, unknown>): string {
  return createHmac("sha256", BUNDLED_HMAC_KEY)
    .update(canonicalJson(counts))
    .digest("hex");
}

/**
 * Minimal valid counts: everything at zero / missing so re-score lands at 0.
 * Only fields that exist in counts matter for scoring; absent fields → NaN → missing.
 */
const BASE_COUNTS: Record<string, unknown> = {
  claude_md_lines: 50,      // dim 1 → have
  settings_valid: true,     // dim 2 → partial (settings_nonempty missing)
  permissions_allow_count: 3, // dim 3 → have
  sub_dir_claude_md_count: 0,
  docs_dir_nonempty: false,
  post_tool_use_hook: "missing",
  pre_tool_use_hook: "missing",
  session_hook: "missing",
  commands_total: 0,
  automation_events: 0,
  skills_total: 0,
  skills_unused_ratio: 1,
  mcp_has_github: false,
  mcp_servers: 0,
  review_agent: false,
  agents_configured: 0,
  test_agent: false,
  plan_mode_ratio: 0,
  avg_bytes_per_read: 0,
  worktrees_detected: 0,
  conventional_ratio: 0,
  verify_hook_present: false,
  any_hook_present: false,
  project_root_count: 3,    // dim 21 → have (<=5)
  orphaned_hooks_fraction: 0,
  duplicate_skill_fraction: 0,
  clean_frontmatter_ratio: 0,
  distinct_heading_count: 3, // dim 25 → have (<=5)
  // Tier counts
  weeks_on_cc: 2,
  sessions_total: 5,
  coherence_score: 0,
  hooks_configured: 0,
  cross_project_consistency_score: 0,
  commit_burst_correlation: 0,
};

function validPayload(): Record<string, unknown> {
  const counts = { ...BASE_COUNTS };
  const hmac = computeHmacFor(counts);
  return {
    schema_version: "1.0",
    rubric_version: "0.1.0",
    scanner_version: "0.0.1-alpha.0",
    scanned_at: "2026-04-27T12:00:00.000Z",
    handle: null,
    previous_scan_id: null,
    os: "darwin",
    node_version: "20.0.0",
    tier: "Explorer",
    score: 20,           // client-reported (may differ from server re-score)
    weeks_on_cc: 2,
    hours_with_cc: null,
    hours_hidden: true,
    counts,
    chapters: {
      Foundation: { score: 40, states: ["have", "partial", "missing", "missing", "missing"] },
      Automation: { score: 0, states: ["missing", "missing", "missing", "missing", "missing"] },
      Delegation: { score: 0, states: ["missing", "missing", "missing", "missing", "missing"] },
      Craft: { score: 0, states: ["missing", "missing", "missing", "missing", "missing"] },
      Coherence: { score: 0, states: ["missing", "missing", "missing", "missing", "missing"] },
    },
    chapter_tags: ["weak", "weak", "weak", "weak", "weak"],
    musthaves: Array(15).fill("missing"),
    signature_verbs: [],
    tiles: [],
    identity: "Explorer",
    hours_meaning: "no time back yet",
    hours_label: "hours with Claude Code",
    chapter_note: "",
    diagnostics: {},
    integrity: { client_hmac: hmac, hmac_key_id: "v1" },
  };
}

function req(body: unknown): Request {
  return new Request("http://x/api/scan", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("/api/scan", () => {
  beforeEach(() => {
    delete process.env["OVER_CAPACITY"];
    vi.mocked(rateLimitOk).mockResolvedValue({ ok: true, retryAfterSec: 3600 });
  });

  it("returns 503 when OVER_CAPACITY=1", async () => {
    process.env["OVER_CAPACITY"] = "1";
    const r = await POST(req({}) as Parameters<typeof POST>[0]);
    expect(r.status).toBe(503);
    const j = await r.json();
    expect(j.error).toBe("over capacity");
    expect(j.url).toBe("/over-capacity");
  });

  it("rejects payload > 16KB with 413", async () => {
    const huge = "a".repeat(20000);
    const r = await POST(
      new Request("http://x/api/scan", {
        method: "POST",
        body: huge,
        headers: { "Content-Type": "application/json" },
      }) as Parameters<typeof POST>[0],
    );
    expect(r.status).toBe(413);
  });

  it("rejects malformed JSON with 400", async () => {
    const r = await POST(
      new Request("http://x/api/scan", {
        method: "POST",
        body: "{not-json",
        headers: { "Content-Type": "application/json" },
      }) as Parameters<typeof POST>[0],
    );
    expect(r.status).toBe(400);
    const j = await r.json();
    expect(j.error).toBe("bad json");
  });

  it("rejects schema_version mismatch with 426", async () => {
    const r = await POST(req({ schema_version: "0.1" }) as Parameters<typeof POST>[0]);
    expect(r.status).toBe(426);
    const j = await r.json();
    expect(j.required_version).toBe("1.0");
    expect(j.error).toBe("stale client");
  });

  it("rejects missing schema_version with 426", async () => {
    const r = await POST(req({ not_a_version: true }) as Parameters<typeof POST>[0]);
    expect(r.status).toBe(426);
  });

  it("rejects zod-invalid payload with 400", async () => {
    const r = await POST(
      req({ schema_version: "1.0" /* missing other required fields */ }) as Parameters<typeof POST>[0],
    );
    expect(r.status).toBe(400);
    const j = await r.json();
    expect(j.error).toBe("invalid payload");
    expect(Array.isArray(j.issues)).toBe(true);
  });

  it("rejects HMAC mismatch with 400", async () => {
    const body = validPayload();
    (body.integrity as Record<string, unknown>)["client_hmac"] = "00".repeat(32); // wrong
    const r = await POST(req(body) as Parameters<typeof POST>[0]);
    expect(r.status).toBe(400);
    const j = await r.json();
    expect(j.error).toBe("integrity mismatch");
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(rateLimitOk).mockResolvedValue({ ok: false, retryAfterSec: 1800 });
    const r = await POST(req(validPayload()) as Parameters<typeof POST>[0]);
    expect(r.status).toBe(429);
    const j = await r.json();
    expect(j.error).toBe("rate limited");
  });

  it("returns {id, url, score} on happy path", async () => {
    const r = await POST(req(validPayload()) as Parameters<typeof POST>[0]);
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.id).toMatch(/^[a-zA-Z0-9_-]{10}$/);
    expect(j.url).toMatch(/\/scan\/[a-zA-Z0-9_-]{10}$/);
    expect(typeof j.score).toBe("number");
    expect(typeof j.is_suspect).toBe("boolean");
  });

  it("re-scores from counts (ignores client-reported score)", async () => {
    const body = validPayload();
    // Client lies about score; server should compute its own.
    (body as Record<string, unknown>)["score"] = 99;
    // Re-sign so HMAC still passes (HMAC only covers counts, not score).
    const counts = body["counts"] as Record<string, unknown>;
    (body.integrity as Record<string, unknown>)["client_hmac"] = computeHmacFor(counts);
    const r = await POST(req(body) as Parameters<typeof POST>[0]);
    expect(r.status).toBe(200);
    const j = await r.json();
    // Server-computed score must not be 99 (client-reported lie).
    expect(j.score).not.toBe(99);
    // And the response should flag score mismatch anomaly (is_suspect = true).
    expect(j.is_suspect).toBe(true);
  });
});
