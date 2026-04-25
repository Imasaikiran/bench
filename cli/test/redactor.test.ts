// Note: the plan's verbatim test (lines 1565-1591) had a bug —
// `.find(w => w.length > 20) ?? ""` falls back to "" for short tokens
// (aws key, private key, email cases), and `.not.toContain("")` always
// fails. We pin the sensitive substring per case instead, which is a
// strictly tighter assertion of the same intent.

import { describe, it, expect } from "vitest";
import { redact, REDACTION_PATTERNS } from "../src/redactor";

// 4-tuple: [name, input, expectedKind, sensitiveSubstring]
// sensitiveSubstring is what MUST NOT appear in r.text after redaction.
const cases: Array<[string, string, string, string]> = [
  ["openai key", "leak: sk-proj-ABCDEFGHIJKLMNOPQRSTUVWX", "openai-key", "sk-proj-ABCDEFGHIJKLMNOPQRSTUVWX"],
  ["ghp classic", "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij", "github-pat", "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij"],
  ["jwt", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c", "jwt", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"],
  ["aws key", "AKIAIOSFODNN7EXAMPLE", "aws-access-key", "AKIAIOSFODNN7EXAMPLE"],
  ["private key", "-----BEGIN RSA PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQ\n-----END RSA PRIVATE KEY-----", "private-key", "MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQ"],
  ["email", "contact me at foo@bar.com please", "email", "foo@bar.com"],
  ["home path", "file at /Users/priya/code/x.ts", "home-path", "/Users/priya"],
  ["url with creds", "visit https://user:pass@example.com", "url-userinfo", "user:pass@"],
  // case 10 — regression: url-userinfo must not bleed into email pattern
  ["url-userinfo no email bleed", "visit https://alice:s3cret@internal.corp hello", "url-userinfo", "alice"],
  // cases 11-14 — coverage for previously untested patterns
  ["github-pat-fg", "token: github_pat_" + "A".repeat(82) + " end", "github-pat-fg", "github_pat_AAAAAAAAAA"],
  ["slack-token", "secret xoxb-1234567890-abcdefghijkl end", "slack-token", "xoxb-1234567890-abcdefghijkl"],
  ["aws-secret", "aws_secret_access_key=\"AKIAIOSFODNN7EXAMPLEabcdefghij1234\" end", "aws-secret", "AKIAIOSFODNN7EXAMPLEabcdefghij1234"],
  ["generic-secret", "config password=\"hunter22\" end", "generic-secret", "hunter22"],
];

describe("redact", () => {
  for (const [name, input, kind, sensitive] of cases) {
    it(`redacts ${name}`, () => {
      const r = redact(input);
      const { text } = r;
      expect(text).not.toContain(sensitive);
      expect(r.hits[0]?.kind).toBe(kind);
      // Regression: url-userinfo sentinel must never bleed into email pattern
      if (name === "url-userinfo no email bleed") {
        expect(text).not.toMatch(/<redacted:url-userinfo<redacted:email>/);
      }
      // generic-secret must preserve the key name before the redacted value
      if (name === "generic-secret") {
        expect(text).toContain("password=<redacted:secret>");
      }
    });
  }
  it("returns 0 hits on clean text", () => {
    expect(redact("hello world").hits.length).toBe(0);
  });
});
