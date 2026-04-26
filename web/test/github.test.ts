import { describe, it, expect, beforeEach, afterAll } from "vitest";

// Capture original value so we can restore it after the suite.
const ORIG = process.env["OAUTH_STATE_SECRET"];

describe("github state/session sign+verify", () => {
  beforeEach(() => {
    process.env["OAUTH_STATE_SECRET"] = "test-secret";
    // Bust the module cache so each test gets a fresh import that picks up the
    // env var rather than the throw path. Vitest isolates per-file but not
    // per-test; lazy dynamic import is sufficient here.
  });

  afterAll(() => {
    if (ORIG === undefined) {
      delete process.env["OAUTH_STATE_SECRET"];
    } else {
      process.env["OAUTH_STATE_SECRET"] = ORIG;
    }
  });

  it("state roundtrip", async () => {
    const { signState, verifyState } = await import("../lib/github");
    const token = signState("abc");
    expect(verifyState(token)).toBe(true);
  });

  it("state rejects wrong HMAC", async () => {
    const { signState, verifyState } = await import("../lib/github");
    const token = signState("abc");
    const tampered = token.slice(0, -4) + "xxxx";
    expect(verifyState(tampered)).toBe(false);
  });

  it("session roundtrip", async () => {
    const { signSession, verifySession } = await import("../lib/github");
    const token = signSession({ github_id: 42, login: "alice" });
    const got = verifySession(token);
    expect(got?.github_id).toBe(42);
    expect(got?.login).toBe("alice");
    expect(typeof got?.exp).toBe("number");
  });

  it("session rejects tamper", async () => {
    const { signSession, verifySession } = await import("../lib/github");
    const token = signSession({ github_id: 42, login: "alice" });
    const tampered = token.slice(0, -2) + "xx";
    expect(verifySession(tampered)).toBe(null);
  });

  it("verifySession returns null on missing/empty cookie", async () => {
    const { verifySession } = await import("../lib/github");
    expect(verifySession(undefined)).toBe(null);
    expect(verifySession("")).toBe(null);
  });

  it("verifySession returns null on malformed token (no dot)", async () => {
    const { verifySession } = await import("../lib/github");
    expect(verifySession("nodothere")).toBe(null);
  });
});
