import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../lib/db", () => ({
  sql: vi.fn(async () => [{ id: "abc" }, { id: "def" }]),
}));

import { GET } from "../app/api/cron/expire/route";
import { NextRequest } from "next/server";

function req(authHeader?: string): NextRequest {
  const h = new Headers();
  if (authHeader !== undefined) h.set("authorization", authHeader);
  return new NextRequest("http://x/api/cron/expire", { headers: h });
}

describe("/api/cron/expire", () => {
  const orig = process.env["CRON_SECRET"];
  beforeEach(() => { process.env["CRON_SECRET"] = "test-secret"; });
  afterEach(() => {
    if (orig === undefined) delete process.env["CRON_SECRET"];
    else process.env["CRON_SECRET"] = orig;
  });

  it("403 when CRON_SECRET unset", async () => {
    delete process.env["CRON_SECRET"];
    const r = await GET(req("Bearer test-secret"));
    expect(r.status).toBe(403);
  });

  it("403 when authorization header missing", async () => {
    const r = await GET(req());
    expect(r.status).toBe(403);
  });

  it("403 when bearer token wrong", async () => {
    const r = await GET(req("Bearer wrong-token"));
    expect(r.status).toBe(403);
  });

  it("200 with deleted count when bearer matches", async () => {
    const r = await GET(req("Bearer test-secret"));
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.deleted).toBe(2);
  });
});
