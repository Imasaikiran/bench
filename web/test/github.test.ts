import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { createHmac } from "node:crypto";

// Capture original value so we can restore it after the suite.
const ORIG = process.env["OAUTH_STATE_SECRET"];

// Helper to hand-craft a state token with an arbitrary ts, bypassing signState.
// This lets us test expiry without mocking Date.now().
function craftState(nonce: string, ts: number, secret: string): string {
  const payload = JSON.stringify({ nonce, ts });
  const b64 = Buffer.from(payload, "utf8").toString("base64url");
  const mac = createHmac("sha256", secret).update(b64).digest("base64url");
  return `${b64}.${mac}`;
}

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

  it("state roundtrip — verifyState returns { nonce }", async () => {
    const { signState, verifyState } = await import("../lib/github");
    const token = signState("abc");
    const result = verifyState(token);
    expect(result).not.toBe(null);
    expect(result?.nonce).toBe("abc");
  });

  it("state rejects wrong HMAC", async () => {
    const { signState, verifyState } = await import("../lib/github");
    const token = signState("abc");
    const tampered = token.slice(0, -4) + "xxxx";
    expect(verifyState(tampered)).toBe(null);
  });

  it("verifyState rejects future-dated tokens (negative age)", async () => {
    process.env["OAUTH_STATE_SECRET"] = "test-secret";
    const { verifyState } = await import("../lib/github");
    // ts is 60 seconds in the future → age is negative → rejected
    const future = craftState("abc", Date.now() + 60_000, "test-secret");
    expect(verifyState(future)).toBe(null);
  });

  it("verifyState rejects expired tokens (> 10 min old)", async () => {
    process.env["OAUTH_STATE_SECRET"] = "test-secret";
    const { verifyState } = await import("../lib/github");
    // ts is 11 minutes in the past → beyond 10-min TTL → rejected
    const old = craftState("abc", Date.now() - 11 * 60_000, "test-secret");
    expect(verifyState(old)).toBe(null);
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
