import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { V1Page } from "../lib/v1render";
import type { PersonaShape } from "../lib/mapper";

const persona: PersonaShape = {
  handle: "@priya_dev",
  initial: "P",
  weeks: 14,
  eyebrow: "scanned just now · 14 weeks on claude code",
  title: "You've been building.",
  tiles: [
    { label: "weeks", value: "14", equiv: "" },
    { label: "skills", value: "6", equiv: "" },
    { label: "prompts", value: "~420", equiv: "" },
    { label: "plan mode", value: "41", equiv: "" },
  ],
  identity: "x",
  hours: 187,
  hoursMeaning: "187h back — 23 workdays",
  signature: "you install · you prune · you question",
  score: 62,
  tier: "Tinkerer",
  chapterNote: "z",
  chapterTags: ["partial", "weak", "partial", "strong", "strong"],
  clusters: {
    Foundation: ["have", "have", "partial", "missing", "missing"],
    Automation: ["missing", "missing", "missing", "missing", "missing"],
    Delegation: ["have", "partial", "have", "missing", "missing"],
    Craft: ["have", "have", "partial", "have", "missing"],
    Coherence: ["have", "have", "partial", "have", "partial"],
  },
  musthaves: Array(15).fill("missing") as never,
};

describe("V1Page", () => {
  it("renders shim with persona JSON before script.js", () => {
    const html = renderToString(<V1Page persona={persona} />);
    expect(html).toContain(`window.PERSONAS = { priya:`);
    expect(html).toContain(`"@priya_dev"`);
    expect(html).toContain(`<script src="/v1/script.js"`);
    // Shim must precede the deferred v1 script in document order.
    const shimIdx = html.indexOf("window.PERSONAS");
    const scriptIdx = html.indexOf("/v1/script.js");
    expect(shimIdx).toBeGreaterThan(-1);
    expect(scriptIdx).toBeGreaterThan(shimIdx);
  });

  it("includes v1 body markup (bench-root hook present)", () => {
    const html = renderToString(<V1Page persona={persona} />);
    // Loose assertion: v1 body should bring in some markup. Don't pin to specific
    // selectors — v1 is frozen and structural pinning is owned by v1-frozen.test.ts.
    expect(html).toContain('id="bench-root"');
    expect(html.length).toBeGreaterThan(5000); // v1 body is big
  });

  it("escapes </script> in persona JSON", () => {
    const malicious = { ...persona, identity: "</script><img src=x>" };
    const html = renderToString(<V1Page persona={malicious} />);
    expect(html).not.toContain("</script><img");
    expect(html).toContain("\\u003c/script\\u003e");
  });

  it("og:image meta points to /api/og/<handle>", () => {
    const html = renderToString(<V1Page persona={persona} />);
    expect(html).toContain('property="og:image"');
    expect(html).toContain("https://bench.dev/api/og/priya_dev");
  });

  it("anonymous handle (@anonymous) strips the @ in og url", () => {
    const html = renderToString(
      <V1Page persona={{ ...persona, handle: "@anonymous" }} />,
    );
    expect(html).toContain("https://bench.dev/api/og/anonymous");
  });

  it("strips v1's bootstrap <script src='script.js'> from extracted body", () => {
    const html = renderToString(<V1Page persona={persona} />);
    // Only the injected /v1/script.js path should remain. The relative
    // "script.js" tag from v1/index.html would 404 against the route.
    const matches = html.match(/src=["'][^"']*script\.js["']/g) ?? [];
    expect(matches).toHaveLength(1);
    expect(matches[0]).toContain("/v1/script.js");
  });
});
