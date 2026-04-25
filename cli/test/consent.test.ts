import { describe, it, expect } from "vitest";
import { askConsent } from "../src/consent";

describe("askConsent", () => {
  it("defaults to false on enter", async () => {
    const out = await askConsent({ redactionHits: 0 }, async () => "");
    expect(out.upload).toBe(false);
  });
  it("true on y/Y", async () => {
    expect((await askConsent({ redactionHits: 0 }, async () => "y")).upload).toBe(true);
    expect((await askConsent({ redactionHits: 0 }, async () => "YES")).upload).toBe(true);
  });
  it("false on anything else", async () => {
    expect((await askConsent({ redactionHits: 0 }, async () => "maybe")).upload).toBe(false);
  });
  it("show branch emits redaction listing", async () => {
    const out = await askConsent({ redactionHits: 2, hits: [{ kind: "email" }, { kind: "jwt" }] }, async () => "show\ny");
    expect(out.upload).toBe(true);
    expect(out.shownRedactions).toBe(true);
  });
});
