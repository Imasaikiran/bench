import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { V1Page } from "../lib/v1render";
import { PRIYA_PERSONA } from "./__fixtures__/priya";

const persona = PRIYA_PERSONA;

describe("V1Page", () => {
  it("renders shim with persona JSON before script.js", () => {
    const html = renderToString(<V1Page persona={persona} />);
    // Shim sets window.__BENCH_PERSONA__ and registers a window.load handler
    // that re-runs v1's render functions with our data (overrides the
    // hardcoded const PERSONAS that v1 script.js paints with on boot).
    expect(html).toContain(`window.__BENCH_PERSONA__`);
    expect(html).toContain(`window.addEventListener('load'`);
    expect(html).toContain(`window.renderAtelier`);
    expect(html).toContain(`"@priya_dev"`);
    expect(html).toContain(`<script src="/v1/script.js"`);
    // Shim must precede the deferred v1 script in document order so the
    // 'load' listener is registered before script.js's DOMContentLoaded.
    const shimIdx = html.indexOf("window.__BENCH_PERSONA__");
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

  it("strips v1's bootstrap <script src='script.js'> from extracted body", () => {
    const html = renderToString(<V1Page persona={persona} />);
    // The relative "script.js" tag from v1/index.html must be stripped
    // (it would 404 against the route path). Only the injected /v1/script.js
    // should remain — Plausible is now injected by app/layout.tsx, not V1Page.
    const matches = html.match(/src=["'][^"']*script\.js["']/g) ?? [];
    // Expect exactly 1 match: /v1/script.js (deferred boot).
    // Plausible CDN script is no longer present in V1Page (layout owns it).
    expect(matches).toHaveLength(1);
    expect(matches.some((m) => m.includes("/v1/script.js"))).toBe(true);
    // Relative "script.js" (bare, no path prefix) must not appear.
    expect(matches.some((m) => /src=["']script\.js["']/.test(m))).toBe(false);
    // Plausible must NOT be injected by V1Page — layout owns analytics.
    expect(html).not.toContain("plausible.io");
  });

  it("renders Recommendations section sourced from rubric.yaml", () => {
    const html = renderToString(<V1Page persona={persona} />);
    expect(html).toContain('aria-label="Recommendations"');
    expect(html).toContain("What to do, in order");
    // Heading copy must trace to rubric.yaml rationale, not editorial prose.
    // Foundation #4 ("sub-dir CLAUDE.md") is missing in the fixture, so its
    // name should appear.
    expect(html).toContain("sub-dir CLAUDE.md");
  });

  it("hides Recommendations when score is perfect (all 'have')", () => {
    const allHave = {
      ...persona,
      clusters: {
        Foundation: ["have", "have", "have", "have", "have"],
        Automation: ["have", "have", "have", "have", "have"],
        Delegation: ["have", "have", "have", "have", "have"],
        Craft: ["have", "have", "have", "have", "have"],
        Hygiene: ["have", "have", "have", "have", "have"],
      },
    };
    const html = renderToString(<V1Page persona={allHave as never} />);
    expect(html).not.toContain('aria-label="Recommendations"');
  });

  it("does not emit html/head/body wrappers (fragment only)", () => {
    const html = renderToString(<V1Page persona={persona} />);
    // V1Page must not emit structural tags — layout owns those.
    expect(html).not.toContain("<html");
    expect(html).not.toContain("<body");
    // <head> may appear inside v1 body HTML (unlikely but check it's not from us).
    // We check that og:image meta is NOT present (it's handled by generateMetadata).
    expect(html).not.toContain('property="og:image"');
  });
});
