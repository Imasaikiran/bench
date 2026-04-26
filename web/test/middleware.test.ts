// web/test/middleware.test.ts
// Tests for the basic-auth middleware guarding /internal/*.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { middleware } from "../middleware";
import { NextRequest } from "next/server";

function req(path: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`http://x${path}`, { headers });
}

describe("middleware", () => {
  const origUser = process.env["METRICS_USER"];
  const origPass = process.env["METRICS_PASS"];

  beforeEach(() => {
    process.env["METRICS_USER"] = "admin";
    process.env["METRICS_PASS"] = "s3cret";
  });

  afterEach(() => {
    if (origUser === undefined) delete process.env["METRICS_USER"];
    else process.env["METRICS_USER"] = origUser;
    if (origPass === undefined) delete process.env["METRICS_PASS"];
    else process.env["METRICS_PASS"] = origPass;
  });

  it("passes through non-/internal paths", () => {
    const res = middleware(req("/"));
    // NextResponse.next() may expose x-middleware-next or just be a 200.
    // Accept either: header set to "1" OR a 200 status.
    const nextHeader = res.headers.get("x-middleware-next");
    expect(nextHeader === "1" || res.status === 200).toBe(true);
  });

  it("503 when env unset", () => {
    delete process.env["METRICS_USER"];
    const res = middleware(req("/internal/metrics"));
    expect(res.status).toBe(503);
  });

  it("401 when no Authorization header", () => {
    const res = middleware(req("/internal/metrics"));
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toContain("Basic");
  });

  it("403 when wrong credentials", () => {
    const auth = "Basic " + Buffer.from("admin:wrong").toString("base64");
    const res = middleware(req("/internal/metrics", { authorization: auth }));
    expect(res.status).toBe(403);
  });

  it("passes when correct credentials provided", () => {
    const auth = "Basic " + Buffer.from("admin:s3cret").toString("base64");
    const res = middleware(req("/internal/metrics", { authorization: auth }));
    // NextResponse.next() may set x-middleware-next:"1" or just return 200.
    const nextHeader = res.headers.get("x-middleware-next");
    expect(nextHeader === "1" || res.status === 200).toBe(true);
  });
});
