import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks must be declared before the route import (vi.mock is hoisted).
vi.mock("../lib/db", () => ({ sql: vi.fn() }));
vi.mock("../lib/github", () => ({
  verifySession: vi.fn(),
  signSession: vi.fn(),
  signState: vi.fn(),
  verifyState: vi.fn(),
  exchangeCodeForToken: vi.fn(),
  getGitHubUser: vi.fn(),
}));

import { POST } from "../app/api/claim/route";
import { sql } from "../lib/db";
import { verifySession } from "../lib/github";

// sql is mocked; we need access to sql.transaction as well.
const sqlMock = sql as unknown as ReturnType<typeof vi.fn> & {
  transaction: ReturnType<typeof vi.fn>;
};
const verifySessionMock = verifySession as unknown as ReturnType<typeof vi.fn>;

function req(body: unknown, cookie?: string): Request {
  const h = new Headers({ "Content-Type": "application/json" });
  if (cookie) h.set("cookie", `bench_session=${cookie}`);
  return new Request("http://x/api/claim", {
    method: "POST",
    body: JSON.stringify(body),
    headers: h,
  });
}

describe("/api/claim", () => {
  beforeEach(() => {
    sqlMock.mockReset();
    // Attach transaction mock to the sql mock function.
    sqlMock.transaction = vi.fn();
    verifySessionMock.mockReset();
  });

  it("401 when no session cookie", async () => {
    verifySessionMock.mockReturnValueOnce(null);
    const r = await POST(req({ scan_id: "x" }) as never);
    expect(r.status).toBe(401);
  });

  it("401 when session invalid", async () => {
    verifySessionMock.mockReturnValueOnce(null);
    const r = await POST(req({ scan_id: "x" }, "bad-cookie") as never);
    expect(r.status).toBe(401);
  });

  it("400 when scan_id missing", async () => {
    verifySessionMock.mockReturnValueOnce({
      github_id: 1,
      login: "alice",
      exp: 9e12,
    });
    const r = await POST(req({}, "abc") as never);
    expect(r.status).toBe(400);
  });

  it("400 when scan_id empty string", async () => {
    verifySessionMock.mockReturnValueOnce({
      github_id: 1,
      login: "alice",
      exp: 9e12,
    });
    const r = await POST(req({ scan_id: "" }, "abc") as never);
    expect(r.status).toBe(400);
  });

  it("409 when handle taken by another github_id", async () => {
    verifySessionMock.mockReturnValueOnce({
      github_id: 222,
      login: "priya_dev",
      exp: 9e12,
    });
    // CTE INSERT returns 0 rows → another github_id owns the handle.
    sqlMock.transaction.mockResolvedValueOnce([[], []]);
    const r = await POST(req({ scan_id: "scan1" }, "abc") as never);
    expect(r.status).toBe(409);
  });

  it("302/307 to /u/<handle> on success (same github_id reclaim)", async () => {
    verifySessionMock.mockReturnValueOnce({
      github_id: 111,
      login: "Priya_Dev",
      exp: 9e12,
    });
    // CTE INSERT returns [{ github_id: 111 }] → success.
    sqlMock.transaction.mockResolvedValueOnce([[{ github_id: 111 }], []]);
    const r = await POST(req({ scan_id: "scan1" }, "abc") as never);
    expect([302, 307]).toContain(r.status);
    expect(r.headers.get("location")).toMatch(/\/u\/priya_dev$/);
  });

  it("302/307 to /u/<handle> on first claim (no collision)", async () => {
    verifySessionMock.mockReturnValueOnce({
      github_id: 111,
      login: "alice",
      exp: 9e12,
    });
    // CTE INSERT returns [{ github_id: 111 }] → success.
    sqlMock.transaction.mockResolvedValueOnce([[{ github_id: 111 }], []]);
    const r = await POST(req({ scan_id: "scan1" }, "abc") as never);
    expect([302, 307]).toContain(r.status);
    expect(r.headers.get("location")).toMatch(/\/u\/alice$/);
  });

  it("lowercases the login for the handle", async () => {
    verifySessionMock.mockReturnValueOnce({
      github_id: 42,
      login: "BobSmith",
      exp: 9e12,
    });
    sqlMock.transaction.mockResolvedValueOnce([[{ github_id: 42 }], []]);
    const r = await POST(req({ scan_id: "scan42" }, "abc") as never);
    expect([302, 307]).toContain(r.status);
    expect(r.headers.get("location")).toMatch(/\/u\/bobsmith$/);
  });

  it("503 on DB transaction failure", async () => {
    verifySessionMock.mockReturnValueOnce({
      github_id: 111,
      login: "alice",
      exp: 9e12,
    });
    sqlMock.transaction.mockRejectedValueOnce(new Error("db down"));
    const r = await POST(req({ scan_id: "scan1" }, "abc") as never);
    expect(r.status).toBe(503);
  });
});
