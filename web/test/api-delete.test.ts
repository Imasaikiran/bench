// web/test/api-delete.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/db", () => {
  const sqlFn = vi.fn();
  // Attach a transaction method matching neon's API surface.
  // @ts-expect-error -- test mock; transaction is added at runtime.
  sqlFn.transaction = vi.fn();
  return { sql: sqlFn };
});
vi.mock("../lib/github", () => ({ verifySession: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { POST } from "../app/api/delete/route";
import { sql } from "../lib/db";
import { verifySession } from "../lib/github";

const sqlMock = sql as unknown as ReturnType<typeof vi.fn> & { transaction: ReturnType<typeof vi.fn> };
const verifySessionMock = verifySession as unknown as ReturnType<typeof vi.fn>;

function req(cookie?: string): Request {
  const h = new Headers({ "Content-Type": "application/json" });
  if (cookie) h.set("cookie", `bench_session=${cookie}`);
  return new Request("http://x/api/delete", { method: "POST", body: "{}", headers: h });
}

describe("/api/delete", () => {
  beforeEach(() => {
    sqlMock.mockReset();
    sqlMock.transaction.mockReset();
    verifySessionMock.mockReset();
  });

  it("401 when no session", async () => {
    verifySessionMock.mockReturnValueOnce(null);
    const r = await POST(req() as never);
    expect(r.status).toBe(401);
  });

  it("404 when profile not found", async () => {
    verifySessionMock.mockReturnValueOnce({ github_id: 1, login: "alice", exp: 9e12 });
    sqlMock.mockResolvedValueOnce([]); // SELECT returns empty
    const r = await POST(req("abc") as never);
    expect(r.status).toBe(404);
  });

  it("200 + deletes profile + scan when latest_scan exists", async () => {
    verifySessionMock.mockReturnValueOnce({ github_id: 1, login: "Alice", exp: 9e12 });
    sqlMock.mockResolvedValueOnce([{ handle: "alice", latest_scan: "scan_xyz" }]);
    sqlMock.transaction.mockResolvedValueOnce(undefined);
    const r = await POST(req("abc") as never);
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.ok).toBe(true);
    expect(j.deleted.handle).toBe("alice");
    expect(j.deleted.scans).toBe(1);
  });

  it("200 + deletes only profile when latest_scan null", async () => {
    verifySessionMock.mockReturnValueOnce({ github_id: 1, login: "alice", exp: 9e12 });
    sqlMock.mockResolvedValueOnce([{ handle: "alice", latest_scan: null }]);
    sqlMock.transaction.mockResolvedValueOnce(undefined);
    const r = await POST(req("abc") as never);
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.deleted.scans).toBe(0);
  });

  it("503 on transaction failure", async () => {
    verifySessionMock.mockReturnValueOnce({ github_id: 1, login: "alice", exp: 9e12 });
    sqlMock.mockResolvedValueOnce([{ handle: "alice", latest_scan: "scan_xyz" }]);
    sqlMock.transaction.mockRejectedValueOnce(new Error("db down"));
    const r = await POST(req("abc") as never);
    expect(r.status).toBe(503);
  });

  it("clears session cookie on success", async () => {
    verifySessionMock.mockReturnValueOnce({ github_id: 1, login: "alice", exp: 9e12 });
    sqlMock.mockResolvedValueOnce([{ handle: "alice", latest_scan: null }]);
    sqlMock.transaction.mockResolvedValueOnce(undefined);
    const r = await POST(req("abc") as never);
    const setCookie = r.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("bench_session=");
    expect(setCookie).toMatch(/Max-Age=0|max-age=0/i);
  });
});
