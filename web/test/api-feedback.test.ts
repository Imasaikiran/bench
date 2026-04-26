import { describe, it, expect, vi, beforeEach } from "vitest";

// Factory must not reference outer variables — vi.mock is hoisted.
vi.mock("../lib/db", () => ({ sql: vi.fn() }));

import { POST } from "../app/api/feedback/route";
import { sql } from "../lib/db";

const sqlMock = sql as unknown as ReturnType<typeof vi.fn>;

function req(body: unknown): Request {
  return new Request("http://x/api/feedback", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("/api/feedback", () => {
  beforeEach(() => {
    sqlMock.mockReset();
    delete process.env["OVER_CAPACITY"];
  });

  it("503 when OVER_CAPACITY=1", async () => {
    process.env["OVER_CAPACITY"] = "1";
    const r = await POST(req({ scan_id: "x", reason: "y" }) as never);
    expect(r.status).toBe(503);
  });

  it("413 when body > 4KB", async () => {
    const huge = JSON.stringify({ scan_id: "x", reason: "a".repeat(5000) });
    const r = await POST(req(huge) as never);
    expect(r.status).toBe(413);
  });

  it("400 on bad JSON", async () => {
    const r = await POST(req("{not-json") as never);
    expect(r.status).toBe(400);
  });

  it("400 when zod fails (missing reason)", async () => {
    const r = await POST(req({ scan_id: "abc" }) as never);
    expect(r.status).toBe(400);
  });

  it("404 when scan_id not in scans table", async () => {
    sqlMock.mockResolvedValueOnce([]); // SELECT returns empty
    const r = await POST(req({ scan_id: "missing", reason: "wrong number" }) as never);
    expect(r.status).toBe(404);
  });

  it("200 on happy path with feedback id", async () => {
    sqlMock
      .mockResolvedValueOnce([{ id: "scan_abc" }])  // SELECT
      .mockResolvedValueOnce([{ id: 42 }]);          // INSERT
    const r = await POST(req({ scan_id: "scan_abc", dimension: "hours", reason: "feels low" }) as never);
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.ok).toBe(true);
    expect(j.id).toBe(42);
  });

  it("503 on DB insert failure", async () => {
    sqlMock
      .mockResolvedValueOnce([{ id: "scan_abc" }]) // SELECT ok
      .mockRejectedValueOnce(new Error("db down"));
    const r = await POST(req({ scan_id: "scan_abc", reason: "x" }) as never);
    expect(r.status).toBe(503);
  });

  it("accepts null dimension", async () => {
    sqlMock
      .mockResolvedValueOnce([{ id: "scan_abc" }])
      .mockResolvedValueOnce([{ id: 7 }]);
    const r = await POST(req({ scan_id: "scan_abc", dimension: null, reason: "x" }) as never);
    expect(r.status).toBe(200);
  });
});
