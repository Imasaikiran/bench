import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mocks must be declared before the route import (vi.mock is hoisted).
vi.mock("../lib/github", () => ({
  signState: vi.fn(),
  verifyState: vi.fn(),
  signSession: vi.fn(),
  verifySession: vi.fn(),
  exchangeCodeForToken: vi.fn(),
  getGitHubUser: vi.fn(),
}));

import { GET } from "../app/api/auth/github/route";
import {
  verifyState,
  signSession,
  exchangeCodeForToken,
  getGitHubUser,
} from "../lib/github";

const verifyStateMock = verifyState as unknown as ReturnType<typeof vi.fn>;
const signSessionMock = signSession as unknown as ReturnType<typeof vi.fn>;
const exchangeMock = exchangeCodeForToken as unknown as ReturnType<typeof vi.fn>;
const getUserMock = getGitHubUser as unknown as ReturnType<typeof vi.fn>;

/** Build a NextRequest for the callback with optional cookies. */
function callbackReq(
  code: string,
  state: string,
  cookieHeader?: string,
): NextRequest {
  const url = `http://localhost/api/auth/github?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
  const headers = new Headers();
  if (cookieHeader) headers.set("cookie", cookieHeader);
  return new NextRequest(url, { headers });
}

describe("/api/auth/github callback — state cookie binding (Critical 2)", () => {
  beforeEach(() => {
    verifyStateMock.mockReset();
    signSessionMock.mockReset();
    exchangeMock.mockReset();
    getUserMock.mockReset();
    process.env["GITHUB_CLIENT_ID"] = "test-client-id";
    process.env["GITHUB_CLIENT_SECRET"] = "test-client-secret";
    process.env["OAUTH_STATE_SECRET"] = "test-secret";
  });

  it("400 when no bench_oauth_state cookie is present", async () => {
    // verifyState passes (valid token) but no cookie → should reject.
    verifyStateMock.mockReturnValueOnce({ nonce: "deadbeef" });
    const r = await GET(callbackReq("mycode", "validstate"));
    expect(r.status).toBe(400);
    const body = await r.json() as { error: string };
    expect(body.error).toBe("state nonce mismatch");
  });

  it("400 when cookie nonce does not match state token nonce", async () => {
    // verifyState returns nonce "deadbeef", but cookie has "cafebabe".
    verifyStateMock.mockReturnValueOnce({ nonce: "deadbeef" });
    const r = await GET(
      callbackReq("mycode", "validstate", "bench_oauth_state=cafebabe"),
    );
    expect(r.status).toBe(400);
    const body = await r.json() as { error: string };
    expect(body.error).toBe("state nonce mismatch");
  });

  it("completes flow and redirects to / when nonce matches", async () => {
    const nonce = "matchingnonce1234";
    verifyStateMock.mockReturnValueOnce({ nonce });
    exchangeMock.mockResolvedValueOnce("gh-access-token");
    getUserMock.mockResolvedValueOnce({ id: 42, login: "alice" });
    signSessionMock.mockReturnValueOnce("signed-session-cookie");

    const r = await GET(
      callbackReq("mycode", "validstate", `bench_oauth_state=${nonce}`),
    );
    expect([302, 307]).toContain(r.status);
    expect(r.headers.get("location")).toBe("http://localhost/");
  });

  it("400 when state token itself is invalid (verifyState returns null)", async () => {
    verifyStateMock.mockReturnValueOnce(null);
    const r = await GET(
      callbackReq("mycode", "badstate", "bench_oauth_state=anynonce"),
    );
    expect(r.status).toBe(400);
    const body = await r.json() as { error: string };
    expect(body.error).toBe("invalid state");
  });
});
