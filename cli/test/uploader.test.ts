import { describe, it, expect, vi } from "vitest";
import { upload, ALLOWED_ENDPOINT, BACKOFF_MS, MAX_ATTEMPTS } from "../src/uploader";
import type { Payload } from "../src/payload";

// ---------------------------------------------------------------------------
// Minimal valid Payload fixture
// ---------------------------------------------------------------------------
const basePayload: Payload = {
  schema_version: "1.0",
  rubric_version: "0.1.0",
  scanner_version: "0.0.1-alpha.0",
  scanned_at: "2026-04-25T00:00:00.000Z",
  handle: null,
  previous_scan_id: null,
  os: "linux",
  node_version: "20.0.0",
  tier: "Tinkerer",
  score: 62,
  weeks_on_cc: 14,
  hours_with_cc: 187,
  hours_hidden: false,
  counts: {},
  chapters: {},
  chapter_tags: [],
  musthaves: [],
  signature_verbs: [],
  tiles: [],
  identity: "x",
  hours_meaning: "y",
  hours_label: "hours with Claude Code",
  chapter_note: "z",
  headline_rarity: null,
  diagnostics: {
    redaction_hits: 0,
    parse_warnings: [],
    skipped_files: 0,
    elapsed_ms: 1200,
  },
  integrity: { client_hmac: "abc123", hmac_key_id: "v1" },
};

// ---------------------------------------------------------------------------
// Helper: build a mock fetch that returns a sequence of responses
// ---------------------------------------------------------------------------
function makeFetch(
  ...responses: Array<{ status: number; body?: unknown; bodyText?: string; contentType?: string }>
): { fetch: typeof globalThis.fetch; attempts: () => number; lastInit: () => RequestInit | undefined } {
  let callCount = 0;
  let lastInit: RequestInit | undefined;
  const mockFetch = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => {
    lastInit = _init;
    const resp = responses[callCount] ?? responses[responses.length - 1];
    callCount++;
    return {
      status: resp!.status,
      ok: resp!.status >= 200 && resp!.status < 300,
      json: async () => {
        if (resp!.bodyText !== undefined) {
          // Simulate non-JSON body throwing on .json()
          throw new SyntaxError("Unexpected token < in JSON at position 0");
        }
        return resp!.body ?? {};
      },
    } as Response;
  });
  return {
    fetch: mockFetch as unknown as typeof globalThis.fetch,
    attempts: () => callCount,
    lastInit: () => lastInit,
  };
}

// ---------------------------------------------------------------------------
// Plan stub required tests (§ must-pass)
// ---------------------------------------------------------------------------
describe("plan stub required tests", () => {
  it("1. ALLOWED_ENDPOINT === 'https://bench.dev/api/scan'", () => {
    expect(ALLOWED_ENDPOINT).toBe("https://bench.dev/api/scan");
  });

  it("2. Refuses any endpoint other than ALLOWED_ENDPOINT", async () => {
    await expect(
      upload(basePayload, { endpoint: "https://evil.com/api" })
    ).rejects.toThrow(/egress policy/i);
  });

  it("3. Retries on 5xx up to 3 times (attempts === 3 after all rejections)", async () => {
    const { fetch, attempts } = makeFetch(
      { status: 503 },
      { status: 503 },
      { status: 503 }
    );
    await expect(
      upload(basePayload, { fetch, sleep: async () => {} })
    ).rejects.toThrow(/upload failed after 3 attempts/i);
    expect(attempts()).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Extended hardening tests
// ---------------------------------------------------------------------------
describe("extended uploader tests", () => {
  it("success path: 200 returns parsed JSON", async () => {
    const { fetch, attempts } = makeFetch({
      status: 200,
      body: { id: "abc", url: "https://bench.dev/scan/abc" },
    });
    const result = await upload(basePayload, { fetch });
    expect(result).toEqual({ id: "abc", url: "https://bench.dev/scan/abc" });
    expect(attempts()).toBe(1);
  });

  it("429 → throws /rate-limited/i AND attempts === 1 (terminal, no retry)", async () => {
    const { fetch, attempts } = makeFetch({ status: 429 });
    await expect(
      upload(basePayload, { fetch, sleep: async () => {} })
    ).rejects.toThrow(/rate-limited/i);
    expect(attempts()).toBe(1);
  });

  it("426 with body { required_version: '1.2.0' } → throws /stale-client: 1\\.2\\.0/ AND attempts === 1", async () => {
    const { fetch, attempts } = makeFetch({
      status: 426,
      body: { required_version: "1.2.0" },
    });
    await expect(
      upload(basePayload, { fetch, sleep: async () => {} })
    ).rejects.toThrow(/stale-client: 1\.2\.0/);
    expect(attempts()).toBe(1);
  });

  it("426 with non-JSON body → throws /stale-client: unknown/ AND attempts === 1", async () => {
    const { fetch, attempts } = makeFetch({
      status: 426,
      bodyText: "<html>oops</html>",
      contentType: "text/html",
    });
    await expect(
      upload(basePayload, { fetch, sleep: async () => {} })
    ).rejects.toThrow(/stale-client: unknown/);
    expect(attempts()).toBe(1);
  });

  it("400 → throws and attempts === 1 (terminal)", async () => {
    const { fetch, attempts } = makeFetch({ status: 400 });
    await expect(
      upload(basePayload, { fetch, sleep: async () => {} })
    ).rejects.toThrow();
    expect(attempts()).toBe(1);
  });

  it("302 → throws /http 302/ AND attempts === 1 (terminal)", async () => {
    const { fetch, attempts } = makeFetch({ status: 302 });
    await expect(
      upload(basePayload, { fetch, sleep: async () => {} })
    ).rejects.toThrow(/http 302/);
    expect(attempts()).toBe(1);
  });

  it("5xx then 200: first call returns 503, second returns 200 → attempts === 2, returns parsed JSON", async () => {
    const { fetch, attempts } = makeFetch(
      { status: 503 },
      { status: 200, body: { id: "abc", url: "https://bench.dev/scan/abc" } }
    );
    const result = await upload(basePayload, { fetch, sleep: async () => {} });
    expect(result).toEqual({ id: "abc", url: "https://bench.dev/scan/abc" });
    expect(attempts()).toBe(2);
  });

  it("Network error retried: fetch throws then succeeds → returns JSON", async () => {
    let callCount = 0;
    const mockFetch = vi.fn(async () => {
      callCount++;
      if (callCount === 1) throw new Error("network failure");
      return {
        status: 200,
        ok: true,
        json: async () => ({ id: "abc", url: "https://bench.dev/scan/abc" }),
      } as Response;
    });
    const result = await upload(basePayload, {
      fetch: mockFetch as unknown as typeof globalThis.fetch,
      sleep: async () => {},
    });
    expect(result).toEqual({ id: "abc", url: "https://bench.dev/scan/abc" });
    expect(callCount).toBe(2);
  });

  it("BACKOFF_MS is [1000, 3000] (lock the schedule)", () => {
    expect(BACKOFF_MS).toEqual([1000, 3000]);
  });

  it("MAX_ATTEMPTS is 3 (lock the attempt count constant)", () => {
    expect(MAX_ATTEMPTS).toBe(3);
  });

  it("Backoff sleeps are called with the right delays", async () => {
    const { fetch } = makeFetch(
      { status: 503 },
      { status: 503 },
      { status: 503 }
    );
    const sleep = vi.fn(async (_ms: number) => {});
    await expect(
      upload(basePayload, { fetch, sleep })
    ).rejects.toThrow(/upload failed after 3 attempts/i);
    // Two sleeps between 3 attempts: first after attempt 1, second after attempt 2
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenNthCalledWith(1, 1000);
    expect(sleep).toHaveBeenNthCalledWith(2, 3000);
    // N-1: the dead 8000 entry must never be scheduled
    expect(sleep).not.toHaveBeenCalledWith(8000);
  });

  it("I-3: CRLF in scanner_version is sanitized in User-Agent header", async () => {
    const crlfPayload = { ...basePayload, scanner_version: "1.0.0\r\nX-Inject: bad" };
    const { fetch, lastInit } = makeFetch({
      status: 200,
      body: { id: "abc", url: "https://bench.dev/scan/abc" },
    });
    await upload(crlfPayload, { fetch });
    const userAgent = (lastInit()?.headers as Record<string, string>)?.["User-Agent"] ?? "";
    expect(userAgent).not.toMatch(/\r/);
    expect(userAgent).not.toMatch(/\n/);
  });

  it("S-1: final throw message includes attempt count", async () => {
    const { fetch, attempts } = makeFetch(
      { status: 503 },
      { status: 503 },
      { status: 503 }
    );
    await expect(
      upload(basePayload, { fetch, sleep: async () => {} })
    ).rejects.toThrow(/upload failed after 3 attempts/);
    expect(attempts()).toBe(3);
  });
});
