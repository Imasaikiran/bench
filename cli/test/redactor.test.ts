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
  ["private key", "-----BEGIN RSA PRIVATE KEY-----", "private-key", "-----BEGIN RSA PRIVATE KEY-----"],
  ["email", "contact me at foo@bar.com please", "email", "foo@bar.com"],
  ["home path", "file at /Users/priya/code/x.ts", "home-path", "/Users/priya"],
  ["url with creds", "visit https://user:pass@example.com", "url-userinfo", "user:pass@"],
];

describe("redact", () => {
  for (const [name, input, kind, sensitive] of cases) {
    it(`redacts ${name}`, () => {
      const r = redact(input);
      expect(r.text).not.toContain(sensitive);
      expect(r.hits[0]?.kind).toBe(kind);
    });
  }
  it("returns 0 hits on clean text", () => {
    expect(redact("hello world").hits.length).toBe(0);
  });
});
