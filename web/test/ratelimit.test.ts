import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/db", () => ({ sql: vi.fn() }));

import { hashIp, rateLimitOk } from "../lib/ratelimit";
import { sql } from "../lib/db";

const sqlMock = sql as unknown as ReturnType<typeof vi.fn>;

describe("hashIp", () => {
  it("returns 32-char hex", () => {
    expect(hashIp("1.2.3.4")).toMatch(/^[a-f0-9]{32}$/);
  });

  it("is deterministic within a day", () => {
    expect(hashIp("1.2.3.4")).toBe(hashIp("1.2.3.4"));
  });
});

describe("rateLimitOk", () => {
  beforeEach(() => sqlMock.mockReset());

  it("ok=true under 50 requests", async () => {
    sqlMock.mockResolvedValueOnce([{ request_count: 25 }]);
    const r = await rateLimitOk("hash");
    expect(r.ok).toBe(true);
    expect(r.retryAfterSec).toBeGreaterThan(0);
    expect(r.retryAfterSec).toBeLessThanOrEqual(86400);
  });

  it("ok=true at exactly 50", async () => {
    sqlMock.mockResolvedValueOnce([{ request_count: 50 }]);
    const r = await rateLimitOk("hash");
    expect(r.ok).toBe(true);
  });

  it("ok=false at 51", async () => {
    sqlMock.mockResolvedValueOnce([{ request_count: 51 }]);
    const r = await rateLimitOk("hash");
    expect(r.ok).toBe(false);
  });
});
