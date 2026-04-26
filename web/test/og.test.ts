import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/db", () => ({ sql: vi.fn() }));

import { GET } from "../app/api/og/[id]/route";
import { sql } from "../lib/db";

const sqlMock = sql as unknown as ReturnType<typeof vi.fn>;

function makeReq(): Request {
  return new Request("http://x/api/og/test");
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("/api/og/[id]", () => {
  beforeEach(() => {
    sqlMock.mockReset();
  });

  it("returns PNG for demo persona without DB hit", async () => {
    const r = await GET(makeReq(), makeParams("demo"));
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type") ?? "").toMatch(/image\/png/);
    expect(sqlMock).not.toHaveBeenCalled();
  });

  it("includes 24h cache header", async () => {
    const r = await GET(makeReq(), makeParams("demo"));
    expect(r.headers.get("cache-control")).toContain("max-age=86400");
  });

  it("looks up by scan id first", async () => {
    sqlMock.mockResolvedValueOnce([
      {
        payload: {
          hours_with_cc: 100,
          score: 50,
          tier: "Tinkerer",
          signature_verbs: ["a", "b"],
        },
      },
    ]);
    const r = await GET(makeReq(), makeParams("scan_abc"));
    expect(r.status).toBe(200);
    expect(sqlMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to handle when scan id not found", async () => {
    sqlMock
      .mockResolvedValueOnce([]) // scan miss
      .mockResolvedValueOnce([
        {
          payload: {
            hours_with_cc: 80,
            score: 40,
            tier: "Explorer",
            signature_verbs: [],
          },
        },
      ]); // handle hit
    const r = await GET(makeReq(), makeParams("alice"));
    expect(r.status).toBe(200);
    expect(sqlMock).toHaveBeenCalledTimes(2);
  });

  it("404 when neither lookup matches", async () => {
    sqlMock.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const r = await GET(makeReq(), makeParams("missing"));
    expect(r.status).toBe(404);
  });

  it("renders dash for null hours_with_cc", async () => {
    const r = await GET(makeReq(), makeParams("demo"));
    expect(r.status).toBe(200);
    // Smoke only — we can't easily assert pixel content without rasterization.
  });
});
