// web/test/landing.test.tsx
// Locks key landing-page invariants — copy regression catcher.
// Strategy: render the server component to a string and assert substrings.
// We don't use jsdom (vitest env is "node"), but server components return
// React elements which renderToStaticMarkup can serialise.
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Landing from "../app/page";

describe("landing page copy invariants", () => {
  const html = renderToStaticMarkup(<Landing />);

  it("contains the npx install command exactly", () => {
    // CopyInstall is a client component; SSR renders the literal text.
    expect(html).toContain("npx @imasaikiran/bench");
  });

  it("links to /demo as primary CTA", () => {
    expect(html).toMatch(/href="\/demo"/);
  });

  it("links to /how-we-scored", () => {
    expect(html).toMatch(/href="\/how-we-scored"/);
  });

  it("links to /rubric", () => {
    expect(html).toMatch(/href="\/rubric"/);
  });

  it("does NOT promise the CLI is live (Phase 0/1 framing)", () => {
    // After launch, this assertion can flip. Until then guard against
    // "the CLI is live" being merged before npm publish.
    expect(html.toLowerCase()).not.toContain("the cli is live");
  });

  it("trust posture covers the 6 spec §10.2 items", () => {
    const lower = html.toLowerCase();
    expect(lower).toContain("open-source scanner");
    expect(lower).toContain("no llm in the scoring path");
    expect(lower).toContain("consent gate");
    expect(lower).toContain("single egress");
    expect(lower).toContain("30-day ttl");
    expect(lower).toContain("zero revenue");
  });

  it("hero h1 exists and is non-empty", () => {
    const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
    expect(m).not.toBeNull();
    expect((m?.[1] ?? "").replace(/<[^>]+>/g, "").trim().length).toBeGreaterThan(10);
  });

  it("references both phase 0 signal audit and design spec", () => {
    expect(html).toMatch(/phase0-signal/);
    expect(html).toMatch(/2026-04-25-bench-v2-design/);
  });
});
