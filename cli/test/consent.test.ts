import { describe, it, expect, vi } from "vitest";
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
    const hits = [{ kind: "email" as const }, { kind: "jwt" as const }];
    const sink = vi.fn();
    const out = await askConsent(
      { redactionHits: 2, hits },
      async () => "show\ny",
      sink,
    );
    expect(out.upload).toBe(true);
    expect(out.shownRedactions).toBe(true);
    expect(sink).toHaveBeenCalledOnce();
    expect(sink).toHaveBeenCalledWith(hits);
  });

  // I-2: strict-yes regression tests
  it("'yarrr' → upload: false", async () => {
    expect((await askConsent({ redactionHits: 0 }, async () => "yarrr")).upload).toBe(false);
  });
  it("'Y' → upload: true", async () => {
    expect((await askConsent({ redactionHits: 0 }, async () => "Y")).upload).toBe(true);
  });
  it("'yes' → upload: true", async () => {
    expect((await askConsent({ redactionHits: 0 }, async () => "yes")).upload).toBe(true);
  });
  it("only whitespace → upload: false", async () => {
    expect((await askConsent({ redactionHits: 0 }, async () => "   ")).upload).toBe(false);
  });
  it("empty string → upload: false", async () => {
    expect((await askConsent({ redactionHits: 0 }, async () => "")).upload).toBe(false);
  });
});
